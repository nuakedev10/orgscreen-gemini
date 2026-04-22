import { Router } from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  generateJobDescription
} from '../controllers/jobController';

const router = Router();

router.post('/generate-description', generateJobDescription);
router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.put('/:id', updateJob);

export default router;