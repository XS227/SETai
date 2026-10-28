#!/usr/bin/env python3
"""Export project identities for privileged processes without exposing their arguments."""
import json
import os
import pathlib


def main():
    config = json.loads(pathlib.Path('/etc/setai-server-status/projects.json').read_text())
    roots = sorted([(os.path.realpath(root), project['id']) for project in config
                    for root in project.get('roots', [])], key=lambda item: len(item[0]), reverse=True)
    result = {}
    for directory in pathlib.Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            cwd = os.readlink(directory / 'cwd')
            tail = (directory / 'stat').read_text().rsplit(')', 1)[1].split()
            for root, identity in roots:
                if cwd == root or cwd.startswith(root + '/'):
                    result[directory.name] = {'project': identity, 'start_ticks': int(tail[19])}
                    break
        except (OSError, ValueError, IndexError):
            continue
    target = pathlib.Path('/run/setai-server-status/project-process-map.json')
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(result, separators=(',', ':')))
    temp.chmod(0o644)
    temp.replace(target)


if __name__ == '__main__':
    main()
