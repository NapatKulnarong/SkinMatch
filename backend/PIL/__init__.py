"""Lightweight stub for Pillow so ImageField checks pass in environments without Pillow.

This provides minimal stand-ins for Pillow's ``Image`` and ``ImageFile`` modules.
The project primarily relies on external URLs for imagery, so raising a runtime
error when image decoding is attempted is acceptable in constrained dev setups.
"""


class _StubImage:
    @staticmethod
    def open(*_args, **_kwargs):
        raise RuntimeError("Pillow is required to process image files.")


class _StubImageFile:
    Image = _StubImage


Image = _StubImage
ImageFile = _StubImageFile

__all__ = ["Image", "ImageFile"]
