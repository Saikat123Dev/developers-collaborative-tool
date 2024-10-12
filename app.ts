import express, { Request, Response } from "express";
import router from "./src/routes/user.route";
import { initializeBloomFilter } from "./src/controllers/user.controller";
import { sendEmail } from "./src/utils/emailService";

const app = express();
const PORT = 3000;

app.use(express.json());

async function onServerRestart() {
  console.log('Server has restarted. Executing initialization tasks...');
  await initializeBloomFilter();
  console.log('Initialization completed.');
}

app.use("/api", router);

interface EmailRequestBody {
  to: string;
  subject: string;
  text: string;
}

app.post('/api/send-email', (req: Request<{}, {}, EmailRequestBody>, res: Response) => {
  const { to, subject, text } = req.body;
  sendEmail(to, subject, text)
    .then(() => {
      res.status(200).json({ message: 'Email sent successfully' });
    })
    .catch((error) => {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.listen(PORT, async () => {
  console.log(`APP is listening on port ${PORT}`);
  await onServerRestart();
});