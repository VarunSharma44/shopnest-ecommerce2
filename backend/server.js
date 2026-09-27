import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, 'data.json');
const PORT = 5000;
const SECRET = process.env.JWT_SECRET || 'shopnest-demo-secret-change-me';
const app = express();
app.use(cors());
app.use(express.json());

function read(){ return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
function write(data){ fs.writeFileSync(DATA, JSON.stringify(data, null, 2)); }
function auth(req,res,next){
  const token = req.headers.authorization?.replace('Bearer ','');
  if(!token) return res.status(401).json({message:'Authentication required'});
  try { req.user = jwt.verify(token, SECRET); next(); } catch { res.status(401).json({message:'Invalid or expired token'}); }
}
function sign(user){ return jwt.sign({id:user.id,email:user.email,name:user.name,role:user.role}, SECRET, {expiresIn:'2h'}); }

app.get('/api/health', (_,res)=>res.json({status:'ok',service:'ShopNest API'}));

app.get('/api/products', (req,res)=>{
  const db=read(); let items=[...db.products];
  const {search='',category='',sort='featured'}=req.query;
  if(search) items=items.filter(p=>`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(search.toLowerCase()));
  if(category && category!=='All') items=items.filter(p=>p.category===category);
  if(sort==='price-low') items.sort((a,b)=>a.price-b.price);
  if(sort==='price-high') items.sort((a,b)=>b.price-a.price);
  if(sort==='rating') items.sort((a,b)=>b.rating-a.rating);
  res.json(items);
});

app.get('/api/products/:id',(req,res)=>{
  const p=read().products.find(x=>x.id===req.params.id);
  p ? res.json(p) : res.status(404).json({message:'Product not found'});
});

app.post('/api/auth/register', async (req,res)=>{
  const {name,email,password}=req.body;
  if(!name || !email || !password || password.length<6) return res.status(400).json({message:'Name, valid email and 6+ character password are required'});
  const db=read();
  if(db.users.some(u=>u.email===email.toLowerCase())) return res.status(409).json({message:'Email already registered'});
  const user={id:uuid(),name,email:email.toLowerCase(),password:await bcrypt.hash(password,10),role:'customer'};
  db.users.push(user); write(db);
  res.status(201).json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});
});

app.post('/api/auth/login', async (req,res)=>{
  const {email,password}=req.body; const db=read();
  let user=db.users.find(u=>u.email===email?.toLowerCase());
  if(!user && email?.toLowerCase()==='admin@shopnest.dev'){
    const hash=await bcrypt.hash('Admin@123',10); user={id:'admin-1',name:'ShopNest Admin',email:'admin@shopnest.dev',password:hash,role:'admin'}; db.users.push(user); write(db);
  }
  if(!user || !(await bcrypt.compare(password,user.password))) return res.status(401).json({message:'Invalid email or password'});
  res.json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});
});

app.get('/api/orders',auth,(req,res)=>res.json(read().orders.filter(o=>o.userId===req.user.id).reverse()));

app.post('/api/orders',auth,(req,res)=>{
  const {items,shipping}=req.body;
  if(!Array.isArray(items)||!items.length) return res.status(400).json({message:'Cart is empty'});
  const db=read(); let total=0; const orderItems=[];
  for(const item of items){
    const product=db.products.find(p=>p.id===item.productId);
    const qty=Number(item.quantity);
    if(!product || !Number.isInteger(qty) || qty<1) return res.status(400).json({message:'Invalid cart item'});
    if(product.stock<qty) return res.status(400).json({message:`Only ${product.stock} left for ${product.name}`});
    product.stock-=qty; total+=product.price*qty;
    orderItems.push({productId:product.id,name:product.name,price:product.price,quantity:qty});
  }
  const order={id:`ORD-${Date.now().toString().slice(-8)}`,userId:req.user.id,items:orderItems,total,shipping,status:'Confirmed',createdAt:new Date().toISOString()};
  db.orders.push(order); write(db); res.status(201).json(order);
});

app.post('/api/products',auth,(req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({message:'Admin access required'});
  const {name,category,price,rating=4.5,stock,image,description}=req.body;
  if(!name||!category||!price||!stock||!image||!description) return res.status(400).json({message:'All product fields are required'});
  const db=read(); const product={id:uuid(),name,category,price:Number(price),rating:Number(rating),stock:Number(stock),image,description};
  db.products.push(product); write(db); res.status(201).json(product);
});

app.listen(PORT,()=>console.log(`ShopNest API running at http://localhost:${PORT}`));
                                               
