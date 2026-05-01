import { Router } from 'express';
import {
  addCandidates,
  uploadCSVCandidates,
  uploadPDFCandidate,
  uploadPDFCandidates,
  getCandidates,
  updateCandidateStatus
} from '../controllers/candidateController';
import { upload, resumeUpload } from '../middleware/upload';

const router = Router();

router.post('/', addCandidates);
router.post('/upload/csv', upload.single('file'), uploadCSVCandidates);
router.post('/upload/pdf', upload.single('file'), uploadPDFCandidate);
router.post('/upload/pdfs', resumeUpload.array('files', 25), uploadPDFCandidates);
router.get('/', getCandidates);
router.patch('/:id/status', updateCandidateStatus);

export default router;