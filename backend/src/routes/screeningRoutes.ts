import { Router } from 'express';
import {
  triggerScreening,
  getScreeningResults,
  rerankCandidates,
  chatWithShortlist,
  downloadReport,
  previewDecisionEmails,
  confirmDecisionEmails
} from '../controllers/screeningController';

const router = Router();

router.post('/trigger', triggerScreening);
router.get('/results/:jobId', getScreeningResults);
router.post('/rerank', rerankCandidates);
router.post('/chat', chatWithShortlist);
router.get('/report/:jobId', downloadReport);
router.post('/send-emails', previewDecisionEmails);
router.post('/confirm-emails', confirmDecisionEmails);

export default router;