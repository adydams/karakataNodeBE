const request = require("supertest");
const app = require("../app"); // your Express app

describe("POST /api/shipping/address", () => {
  it("should create a shipping address for a paid order", async () => {
    const token = "<your-valid-jwt>"; // mock or generate during test
    const res = await request(app)
      .post("/api/shipping/address")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: "123e4567-e89b-12d3-a456-426614174000",
        addressLine1: "12 Broad Street",
        addressLine2: "Apt 5",
        city: "Lagos",
        state: "Lagos",
        postalCode: "101001",
        country: "Nigeria"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("orderId");
  });
});
