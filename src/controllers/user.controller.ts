import { PrismaClient } from "@prisma/client";
import { Response, Request } from "express";
import bcrypt from 'bcrypt';
import { signupSchema } from "../validation/Signup.Schema";
import { loginSchema } from "../validation/Login.Schema";
import { CountingBloomFilter } from 'bloom-filters';
import Redis from 'ioredis';
import {generateToken} from "../utils/generateToken";
import { sendEmail } from "../utils/emailService";
import {generateVerificationToken} from "../utils/generateToken"
const prisma = new PrismaClient();
const filter = new CountingBloomFilter(1000000, 5);
const redis = new Redis();

async function initializeBloomFilter() {
  const users = await prisma.user.findMany({
    select: { username: true }
  });
  users.forEach(user => filter.add(user.username));
  console.log(`Bloom filter initialized with ${users.length} users`);
}



const createUser = async (req: Request, res: Response) => {
    const { email, name, username, password } = req.body;
    try {
      const signUpValidation = signupSchema.safeParse(req.body);
      if (!signUpValidation.success) {
        return res.status(400).json({ errors: signUpValidation.error.errors });
      }
  
      // Check if username already exists
      if (filter.has(username)) {
        const cachedUser = await redis.get(username);
        if (cachedUser) {
          return res.status(400).json({ message: "Username already exists" });
        } else {
          const existingUser = await prisma.user.findUnique({
            where: { username },
          });
          if (existingUser) {
            await redis.set(username, JSON.stringify(existingUser), 'EX', 3600);
            return res.status(400).json({ message: "Username already exists" });
          }
        }
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate a verification token
     
      const verificationToken = generateVerificationToken({
          username
      });
  
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          username,
          password: hashedPassword,
          verificationToken,
        },
      });
 
      const verificationLink = `http://localhost:3000/api/verify-email?token=${verificationToken}`;
      await sendEmail(email, "Email Verification", `Please verify your email by clicking on this link: ${verificationLink}`);
  
      filter.add(username);
      await redis.set(username, JSON.stringify(newUser), 'EX', 3600);
  
      const payload = {
        id: newUser.id,
        username: newUser.username,
      };
      const token = generateToken(payload);
      
      return res.status(201).json({ message: "User created successfully. Please check your email to verify your account.", user: newUser, token });
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  

  export const verifyEmail = async (req:Request, res:Response) => {
    const token = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  
    try {
      if (typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid token' });
      }
  
     
      const user = await prisma.user.findFirst({
        where: { verificationToken: token },
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
  
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verified: true,
          verificationToken: null, 
        },
      });
  
      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

const loginUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const loginValidation = loginSchema.safeParse(req.body);
    if (!loginValidation.success) {
      return res.status(400).json({ errors: loginValidation.error.errors });
    }

    let user;
    const cachedUser = await redis.get(username);
    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      user = await prisma.user.findUnique({
        where: { username },
      });
      if (user) {
        await redis.set(username, JSON.stringify(user), 'EX', 3600);
         if (!filter.has(username)) {
          filter.add(username);
        }
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const payload = {
      id: user.id,
      username: user.username,
    };
    const token = generateToken(payload);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return res.status(200).json({ message: "Login successful", user, token });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logoutUser = (req: Request, res: Response) => {
  try {
   
    res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const deleteUser = async (req: Request, res: Response) => {
    const { password } = req.body;
    const { userPayload } = req;
    const username = userPayload?.username;
  
   
    if (!username) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
      }
  
      
      await prisma.user.delete({
        where: { username },
      });
  
      if (filter.has(username)) {
        filter.remove(username); }
  
     await redis.del(username);
  
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  
export { createUser, loginUser, logoutUser,deleteUser, initializeBloomFilter };