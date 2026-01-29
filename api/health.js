module.exports = (req, res) => {
  res.status(200).json({ status: "online", api: "PE NA PORTA", alive: true });
};
