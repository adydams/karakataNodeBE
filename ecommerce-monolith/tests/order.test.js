const request = require("supertest");
const app = require("../app"); // your Express app entry file
const jwt = require("jsonwebtoken");

describe("Orders API", () => {
  let token;
  let createdOrderId;

  beforeAll(() => {
    // create a mock JWT for testing (replace with your real secret)
    token = jwt.sign(
      { id: "user-123", role: "customer" }, // payload
      process.env.JWT_SECRET || "test-secret", // secret
      { expiresIn: "1h" }
    );
  });

  it("should create an order and initialize payment (checkout)", async () => {
    const res = await request(app)
      .post("/orders/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddressId: "c2fa7d6a-04b2-44c8-a55d-1ff1a8f2c999",
        phone: "+2348012345678",
        notes: "Leave package at the gate",
        gateway: "paystack"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("order");
    expect(res.body).toHaveProperty("paymentUrl");

    createdOrderId = res.body.order.id; // store orderId for next test
  });

  it("should verify payment for the order", async () => {
    const res = await request(app)
      .post(`/orders/verify/${createdOrderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("order");
    expect(res.body).toHaveProperty("verified");
    expect(res.body.verified).toBe(true); // depending on your logic
  });
});
