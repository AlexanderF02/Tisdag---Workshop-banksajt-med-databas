import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { sequelize, User, Account, Session } from './db.js';

const app = express();
const port = 3004;

app.use(cors());
app.use(bodyParser.json());

function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
}

app.post('/users', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = await User.create({ username, password });
        await Account.create({ userId: newUser.id });
        res.status(201).json({ message: "Användare skapad" });
    } catch (error) {
        res.status(500).json({ message: "Error creating user" });
    }
});

app.post('/sessions', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username, password } });
        if (user) {
            const otp = generateOTP();
            await Session.create({ userId: user.id, token: otp });
            res.status(200).json({ otp });
        } else {
            res.status(401).json({ message: 'Fel användarnamn eller lösenord' });
        }
    } catch (error) {
        res.status(500).json({ message: "Error creating session" });
    }
});

app.post('/me/accounts', async (req, res) => {
    const { token } = req.body;
    try {
        const session = await Session.findOne({ where: { token } });
        if (session) {
            const account = await Account.findOne({ where: { userId: session.userId } });
            res.status(200).json({ saldo: account.amount });
        } else {
            res.status(401).json({ message: 'Ogiltigt OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: "Error fetching account" });
    }
});

app.post('/me/accounts/transactions', async (req, res) => {
    const { token, amount } = req.body;
    try {
        const session = await Session.findOne({ where: { token } });
        if (session) {
            const account = await Account.findOne({ where: { userId: session.userId } });
            account.amount += amount;
            await account.save();
            res.status(200).json({ saldo: account.amount });
        } else {
            res.status(401).json({ message: 'Ogiltigt OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: "Error processing transaction" });
    }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "An unexpected error occurred" });
});

app.listen(port, () => {
    console.log(`Bankens backend körs på http://localhost:${port}`);
    sequelize.sync();
});