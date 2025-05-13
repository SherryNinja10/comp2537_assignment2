const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const Joi = require('joi');
const path = require('path');
const app = express();
dotenv.config();

const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 3000;
const salt = process.env.SALT || 10;

app.use("/js", express.static("./public/js"));
app.use("/css", express.static("./public/css"));
app.use("/image", express.static("./public/image"));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})

let usersCollection; // We’ll store our collection here
let sessionsCollection; // We’ll store our collection here

async function connectToDB() {
    try {
        await client.connect();
        const db = client.db("assignment1db"); // Use your actual DB name
        usersCollection = db.collection("users"); // Use your actual collection
        sessionsCollection = db.collection("sessions"); // Use your actual collection
        console.log("✅ Connected to MongoDB Atlas!");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectToDB();

app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        dbName: "assignment1db",
        crypto: {
            secret: process.env.MONGODB_SESSION_SECRET
        }
    }),
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect('/loginpage');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user_type !== 'admin') {
    return res.status(403).redirect('/loginpage');
  }
  next();
}

app.get("/", (req, res) => {

    let html;
    let homeClass = "nav-link active";
    let homeExtraAttributes = 'aria-current="page"';
    let memberClass = "nav-link disabled";
    let memberExtraAttributes = 'aria-disabled="true" tabindex="-1"';
    let adminClass = "nav-link disabled";
    let adminExtraAttributes = 'aria-disabled="true" tabindex="-1"';

    if (req.session.username) {
        html = `<div>
                    <h1>Hello, ${req.session.username}</h1>
                    <ul class="list-unstyled">
                        <li class="mb-2">
                            <a href="/members" class="btn btn-primary">Members Area</a>
                        </li>
                        <li>
                            <form action="/logout" method="POST" class="d-inline">
                                <button type="submit" class="btn btn-danger">Logout</button>
                            </form>
                        </li>
                    </ul>
                </div>`

        memberClass = 'nav-link';
        memberExtraAttributes = '';

        if (req.session.user_type == 'admin') {
            adminClass = 'nav-link';
            adminExtraAttributes = "";
        }

    } else {
        html = `<div>
                    <h1>Welcome</h1>
                    <ul>
                        <li><a href="/loginpage">Login</a></li>
                        <li><a href="/signuppage">Signup</a></li>
                    </ul>
                </div>`
    }
    res.render('index', {
        title: 'Welcome',
        homeClass,
        homeExtraAttributes,
        memberClass,
        memberExtraAttributes,
        adminClass,
        adminExtraAttributes,
        body: html
    });
});

app.get("/loginpage", (req, res) => {
    if (req.session.username) {
        res.redirect("/members");
    } else {
        let homeClass = "nav-link";
        let homeExtraAttributes = '';
        let memberClass = "nav-link disabled";
        let memberExtraAttributes = 'aria-disabled="true" tabindex="-1"';
        let adminClass = "nav-link disabled";
        let adminExtraAttributes = 'aria-disabled="true" tabindex="-1"';

        res.render('login', {
            title: 'Login Page',
            homeClass,
            homeExtraAttributes,
            memberClass,
            memberExtraAttributes,
            adminClass,
            adminExtraAttributes,
        });
    }
});

app.get("/signuppage", (req, res) => {
    if (req.session.username) {
        res.redirect("/members");
    } else {
        let homeClass = "nav-link";
        let homeExtraAttributes = '';
        let memberClass = "nav-link disabled";
        let memberExtraAttributes = 'aria-disabled="true" tabindex="-1"';
        let adminClass = "nav-link disabled";
        let adminExtraAttributes = 'aria-disabled="true" tabindex="-1"';

        res.render('signup', {
            title: 'Signup Page',
            homeClass,
            homeExtraAttributes,
            memberClass,
            memberExtraAttributes,
            adminClass,
            adminExtraAttributes,
        });
    }
});

app.get('/members',
  requireLogin,
  (req, res) => {
    let homeClass = 'nav-link';
    let homeExtraAttributes = '';
    let memberClass = 'nav-link active';
    let memberExtraAttributes = 'aria-current="page"';
    let adminClass = 'nav-link disabled';
    let adminExtraAttributes = 'aria-disabled="true" tabindex="-1"';

    if (req.session.user_type === 'admin') {
      adminClass = 'nav-link';
      adminExtraAttributes = '';
    }

    res.render('members', {
      title: 'Members Page',
      homeClass,
      homeExtraAttributes,
      memberClass,
      memberExtraAttributes,
      adminClass,
      adminExtraAttributes
    });
  }
);

app.get('/admin',
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const users = await usersCollection.find({}).toArray();
    res.render('admin', {
      title: 'Admin Dashboard',
      homeClass: 'nav-link',
      homeExtraAttributes: '',
      memberClass: 'nav-link',
      memberExtraAttributes: '',
      adminClass: 'nav-link active',
      adminExtraAttributes: 'aria-current="page"',
      users
    });
  }
);

app.post("/signup", async (req, res) => {
    const json = req.body;

    // STEP 1: Create a Joi schema
    const schema = Joi.object({
        username: Joi.string().max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(20).required(),
        role: Joi.string().required()
    });

    // STEP 2: Validate user input against the schema
    const validationResult = schema.validate(json);

    if (validationResult.error) {
        console.log(validationResult.error);
        return res.status(400).json({ error: validationResult.error.details[0].message });
    }

    const salt = 12;
    const hashedPassword = bcrypt.hashSync(json.password, salt);

    const user = {
        username: json.username,
        email: json.email,
        password: hashedPassword,
        role: json.role
    };

    try {
        const result = await usersCollection.insertOne(user);
        req.session.username = user.username;
        req.session.user_type = user.role;
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Failed to insert user` });
    }
});

app.post("/login", async (req, res) => {
    const json = req.body;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(20).required()
    });

    const validationResult = schema.validate(json);

    if (validationResult.error) {
        console.log(validationResult.error);
        return res.status(400).json({ error: validationResult.error.details[0].message });
    }

    const result = await usersCollection.findOne({ email: json.email })

    if (result) {
        const match = await bcrypt.compare(json.password, result.password);
        if (match) {
            req.session.username = result.username;
            req.session.user_type = result.role;
            res.redirect("/");
        } else {
            res.status(500).json({ message: `This email does not have an account or the password for this email is wrong` });
        }
    } else {
        res.status(500).json({ message: `This email does not have an account or the password for this email is wrong` });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Error logging out");
        } else {
            res.redirect("/");
        }
    });
});

app.post('/admin/promote', async (req, res) => {
    const userId = req.body.id;
    if (!userId) {
        return res.status(400).send('Missing user ID');
    }

    try {
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role: 'admin' } }
        );

        res.redirect('/admin');
    } catch (err) {
        console.error('Error promoting user:', err);
        res.status(500).send('Internal server error');
    }
});

app.post('/admin/demote', async (req, res) => {
    const userId = req.body.id;
    if (!userId) {
        return res.status(400).send('Missing user ID');
    }

    try {
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role: 'member' } }
        );

        res.redirect('/admin');
    } catch (err) {
        console.error('Error demoting user:', err);
        res.status(500).send('Internal server error');
    }
});

app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
});

app.listen(port, () => {
    console.log('Server running at http://localhost:' + port);
});