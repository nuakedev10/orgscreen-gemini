import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Organizations
export const createOrganization = (data: any) => api.post('/organizations', data);
export const getOrganizations = () => api.get('/organizations');
export const getOrganization = (id: string) => api.get(`/organizations/${id}`);
export const updateOrganization = (id: string, data: any) => api.put(`/organizations/${id}`, data);
export const deleteOrganization = (id: string) => api.delete(`/organizations/${id}`);

// Jobs
export const createJob = (data: any) => api.post('/jobs', data);
export const getJobs = (organizationId: string) => api.get(`/jobs?organizationId=${organizationId}`);
export const getJob = (id: string) => api.get(`/jobs/${id}`);

// Candidates
export const addCandidates = (data: any) => api.post('/candidates', data);
export const getCandidates = (jobId: string) => api.get(`/candidates?jobId=${jobId}`);
export const uploadCSV = (formData: FormData) => api.post('/candidates/upload/csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const uploadMultiplePDFs = (formData: FormData) => api.post('/candidates/upload/pdfs', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  // AI extraction for 20+ resumes can take a while; give Axios room.
  timeout: 10 * 60 * 1000
});

// Screening
export const triggerScreening = (data: any) => api.post('/screening/trigger', data);
export const getScreeningResults = (jobId: string) => api.get(`/screening/results/${jobId}`);
export const rerankCandidates = (data: any) => api.post('/screening/rerank', data);
export const chatWithShortlist = (data: any) => api.post('/screening/chat', data);
export const previewDecisionEmails = (data: any) => api.post('/screening/send-emails', data);
export const confirmDecisionEmails = (data: any) => api.post('/screening/confirm-emails', data);

export const downloadReport = async (jobId: string) => {
  const response = await api.get(`/screening/report/${jobId}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `OrgScreen-Report-${jobId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Job AI
export const generateJobDescription = (data: any) => api.post('/jobs/generate-description', data);

// Candidate decisions
export const updateCandidateStatus = (id: string, status: string) => api.patch(`/candidates/${id}/status`, { status });