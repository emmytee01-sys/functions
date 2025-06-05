import 'dotenv/config';
import app from "./index.js"; // or "./dist/index.js" if built

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});