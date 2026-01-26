import { VercelRequest, VercelResponse } from '@vercel/node';
import projectsIndex from '../backend/handlers/projects/index';
import projectsImport from '../backend/handlers/projects/import';
import projectsId from '../backend/handlers/projects/_id';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path === '/api/projects' || path === '/api/projects/') return await projectsIndex(req, res);
    if (path.endsWith('/import')) return await projectsImport(req, res);

    // Single Project (ID)
    const parts = path.split('/');
    if (parts.length === 4 && parts[2] === 'projects') {
        req.query.id = parts[3];
        return await projectsId(req, res);
    }

    return res.status(404).json({ error: 'Project route not found' });
}
