#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Set library path for pyzbar on macOS (Homebrew installation)
# This ensures zbar library can be found even if DYLD_FALLBACK_LIBRARY_PATH is not set
if sys.platform == 'darwin':  # macOS
    homebrew_lib_path = '/opt/homebrew/lib'
    if os.path.exists(homebrew_lib_path):
        current_lib_path = os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', '')
        if homebrew_lib_path not in current_lib_path:
            os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = (
                f'{homebrew_lib_path}:' + current_lib_path
                if current_lib_path
                else homebrew_lib_path
            )


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'apidemo.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
