import re
import sys
import xml.etree.ElementTree as ET


def parse_bounds(value):
    match = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", value or "")
    return tuple(int(g) for g in match.groups()) if match else None


def nodes(xml):
    root = ET.fromstring(xml)
    for node in root.iter("node"):
        label = node.get("text") or node.get("content-desc") or ""
        bounds = parse_bounds(node.get("bounds"))
        if bounds:
            yield label, bounds


def find(xml, needle, index):
    matches = [b for label, b in nodes(xml) if needle.lower() in label.lower()]
    if len(matches) <= index:
        return None
    x1, y1, x2, y2 = matches[index]
    return (x1 + x2) // 2, (y1 + y2) // 2


def main():
    command, needle = sys.argv[1], sys.argv[2]
    index = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    raw = sys.stdin.buffer.read().decode("utf-8", errors="ignore")
    start = raw.find("<?xml")
    xml = raw[start:] if start >= 0 else raw
    try:
        point = find(xml, needle, index)
    except ET.ParseError:
        point = None
    if point is None:
        sys.exit(1)
    if command == "find":
        print(point[0], point[1])


main()
