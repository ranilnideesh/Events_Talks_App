from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import time
import re

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 600  # 10 minutes

def parse_release_notes_xml(xml_content):
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parse Error: {e}")
        return []
        
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        # Title of the entry is typically the publication date (e.g., "June 16, 2026")
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        # Unique ID
        id_elem = entry.find('atom:id', ns)
        entry_id = id_elem.text.strip() if id_elem is not None else ""
        
        # Link
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        url = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        # Updated Timestamp
        updated_elem = entry.find('atom:updated', ns)
        updated_time = updated_elem.text.strip() if updated_elem is not None else ""
        
        # Content (HTML)
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse content block into individual release notes (categorized by <h3> tags)
        # Using regex split to divide by <h3>Tags</h3>
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        
        parsed_notes = []
        if len(parts) > 1:
            for i in range(1, len(parts), 2):
                category = parts[i].strip()
                # Clean up body HTML (remove CDATA wrappers, strip extra whitespace)
                body_html = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Create a unique ID for this specific note
                note_id = f"{entry_id}-{category}-{i}"
                
                # Strip HTML tags for plain text summaries (useful for sharing on Twitter/X)
                plain_text = re.sub(r'<[^>]+>', '', body_html)
                plain_text = re.sub(r'\s+', ' ', plain_text).strip()
                
                parsed_notes.append({
                    "id": note_id,
                    "category": category,
                    "body_html": body_html,
                    "plain_text": plain_text
                })
        else:
            # Fallback if no <h3> tags are found
            plain_text = re.sub(r'<[^>]+>', '', content_html)
            plain_text = re.sub(r'\s+', ' ', plain_text).strip()
            parsed_notes.append({
                "id": f"{entry_id}-general",
                "category": "General",
                "body_html": content_html,
                "plain_text": plain_text
            })
            
        entries.append({
            "date": date_str,
            "updated": updated_time,
            "url": url,
            "notes": parsed_notes
        })
        
    return entries

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check cache
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION_SECS):
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "release_notes": cache["data"]
        })
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        parsed_data = parse_release_notes_xml(response.text)
        
        # Update Cache
        cache["data"] = parsed_data
        cache["last_fetched"] = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched": current_time,
            "release_notes": parsed_data
        })
        
    except requests.RequestException as e:
        print(f"Error fetching release notes: {e}")
        # Fallback to cache if available on request failure
        if cache["data"]:
            return jsonify({
                "source": "cache_fallback",
                "error": str(e),
                "last_fetched": cache["last_fetched"],
                "release_notes": cache["data"]
            }), 200
            
        return jsonify({
            "error": "Failed to retrieve release notes",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    # Running locally
    app.run(debug=True, port=5000)
