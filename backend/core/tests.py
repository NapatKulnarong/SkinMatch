from django.test import TestCase
import json, os


class HealthzTest(TestCase):
    def test_healthz_returns_ok(self):
        res = self.client.get("/healthz/")
        self.assertEqual(res.status_code, 200)
        self.assertJSONEqual(res.content, {"status": "ok"})
