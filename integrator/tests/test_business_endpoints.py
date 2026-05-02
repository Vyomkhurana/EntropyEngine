import unittest

from fastapi.testclient import TestClient

from orchestrator import app


class BusinessEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_factories_list(self):
        response = self.client.get("/api/factories")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_factory_detail(self):
        response = self.client.get("/api/factories")
        self.assertEqual(response.status_code, 200)
        factory_id = response.json()[0]["id"]
        detail = self.client.get(f"/api/factory/{factory_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json().get("id"), factory_id)

    def test_business_overview(self):
        response = self.client.get("/api/business/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_revenue", data)
        self.assertIn("revenue_trend", data)
        self.assertIn("savings_trend", data)

    def test_revenue_series(self):
        response = self.client.get("/api/revenue?months=6")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 6)


if __name__ == "__main__":
    unittest.main()
