import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

const defaultProjects = [
    { id: 1, title: 'Commercial Complex', category: 'Commercial', status: 'Ongoing', image: 'incompleted.jpeg' },
    { id: 2, title: 'Luxury Villa Design', category: 'Residential', status: 'Completed', image: 'project2.jpeg' }
];

const projectSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    title: String,
    category: String,
    status: { type: String, enum: ['Ongoing', 'Completed'] },
    image: String
}, { versionKey: false });

const Project = mongoose.models.VaishnaviProject || mongoose.model('VaishnaviProject', projectSchema);

function getMongoUri() {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) return null;

    try {
        const parsedUri = new URL(uri);
        if (parsedUri.protocol !== 'mongodb+srv:' || !parsedUri.hostname.endsWith('.mongodb.net')) {
            throw new Error('MONGODB_URI must use the Atlas mongodb+srv URL ending in .mongodb.net.');
        }
    } catch (error) {
        throw new Error(`Invalid MONGODB_URI: ${error.message}`);
    }

    return uri;
}

async function getMongoProjects() {
    const mongoUri = getMongoUri();
    if (!mongoUri) return null;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(mongoUri);
    const projects = await Project.find().sort({ id: -1 }).lean();
    if (projects.length) return projects;
    await Project.insertMany(defaultProjects);
    return defaultProjects;
}

async function getFileProjects() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'projects.json');
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
        return defaultProjects;
    }
}

export default async function handler(request, response) {
    try {
        if (request.method === 'GET') {
            return response.status(200).json((await getMongoProjects()) || await getFileProjects());
        }

        if (request.method === 'PUT') {
            const projects = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            if (!Array.isArray(projects)) {
                return response.status(400).json({ error: 'Projects must be an array.' });
            }

            if (getMongoUri()) {
                if (mongoose.connection.readyState !== 1) await mongoose.connect(getMongoUri());
                await Project.deleteMany({});
                if (projects.length) await Project.insertMany(projects);
            } else {
                return response.status(503).json({ error: 'Set MONGODB_URI in Vercel project settings for shared saves.' });
            }

            return response.status(200).json(projects);
        }

        response.setHeader('Allow', ['GET', 'PUT']);
        return response.status(405).json({ error: 'Method not allowed.' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: error.message || 'Project API failed.' });
    }
}
