import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3000;
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(rootDir, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const defaultProjects = [
    { id: 1, title: 'Commercial Complex', category: 'Commercial', status: 'Ongoing', image: 'incompleted.jpeg' },
    { id: 2, title: 'Luxury Villa Design', category: 'Residential', status: 'Completed', image: 'project2.jpeg' }
];

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(rootDir));

async function readProjects() {
    try {
        return JSON.parse(await fs.readFile(projectsFile, 'utf8'));
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(projectsFile, JSON.stringify(defaultProjects, null, 2));
        return defaultProjects;
    }
}

app.get('/api/projects', async (_request, response) => {
    response.json(await readProjects());
});

app.put('/api/projects', async (request, response) => {
    if (!Array.isArray(request.body)) {
        return response.status(400).json({ error: 'Projects must be an array.' });
    }
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(projectsFile, JSON.stringify(request.body, null, 2));
    response.json(request.body);
});

app.listen(port, () => {
    console.log(`Vaishnavi Construction server running at http://localhost:${port}`);
});