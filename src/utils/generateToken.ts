import jwt from 'jsonwebtoken';

interface UserData {
  id: number;
  username: string;
}
interface verificatonData {
    username :string
}
const generateToken = (userData: UserData) => {
   if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }

  return jwt.sign(
    { id: userData.id, username: userData.username }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }   );
};

const generateVerificationToken = (userData: verificatonData) => {
    if (!process.env.JWT_SECRET) {
     throw new Error("JWT_SECRET is not defined in the environment variables");
   }
 
   return jwt.sign(
     {  username: userData.username }, 
     process.env.JWT_SECRET, 
     { expiresIn: '1h' }   );
 };
 
export  {generateToken,generateVerificationToken};
