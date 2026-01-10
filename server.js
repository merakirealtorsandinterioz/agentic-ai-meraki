const express = require("express");
const app = express();

app.use(express.json());

app.post("/api/lead-intake", (req, res) => {
  console.log("New Lead Received:", req.body);

  res.json({
    status: "success",
    message: "Lead received successfully"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
