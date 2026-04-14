import { sendErrorResult, sendSuccessResult, sendValidationError } from './helpers.js';

/** Searches browser history by text query with optional date range filtering. */
export const handleBrowserSearchHistory = async (
  params: Record<string, unknown>,
  id: string | number,
): Promise<void> => {
  try {
    const query = params.query;
    if (typeof query !== 'string') {
      sendValidationError(id, 'Missing or invalid query parameter');
      return;
    }

    const maxResults =
      typeof params.maxResults === 'number' && Number.isInteger(params.maxResults) && params.maxResults > 0
        ? params.maxResults
        : 20;

    const searchQuery: chrome.history.HistoryQuery = {
      text: query,
      maxResults,
    };

    if (typeof params.startTime === 'string' && params.startTime.length > 0) {
      const ms = Date.parse(params.startTime);
      if (Number.isNaN(ms)) {
        sendValidationError(id, 'Invalid startTime — expected an ISO date string');
        return;
      }
      searchQuery.startTime = ms;
    }

    if (typeof params.endTime === 'string' && params.endTime.length > 0) {
      const ms = Date.parse(params.endTime);
      if (Number.isNaN(ms)) {
        sendValidationError(id, 'Invalid endTime — expected an ISO date string');
        return;
      }
      searchQuery.endTime = ms;
    }

    const items = await chrome.history.search(searchQuery);

    const results = items.map(item => ({
      url: item.url,
      title: item.title,
      visitCount: item.visitCount,
      lastVisitTime: item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : undefined,
    }));

    sendSuccessResult(id, { entries: results });
  } catch (err) {
    sendErrorResult(id, err);
  }
};

/** Gets detailed visit information for a specific URL. */
export const handleBrowserGetVisits = async (params: Record<string, unknown>, id: string | number): Promise<void> => {
  try {
    const url = params.url;
    if (typeof url !== 'string' || url.length === 0) {
      sendValidationError(id, 'Missing or invalid url parameter');
      return;
    }

    const visits = await chrome.history.getVisits({ url });

    const results = visits.map(visit => ({
      visitId: visit.visitId,
      visitTime: visit.visitTime ? new Date(visit.visitTime).toISOString() : undefined,
      referringVisitId: visit.referringVisitId,
      transition: visit.transition,
    }));

    sendSuccessResult(id, { visits: results });
  } catch (err) {
    sendErrorResult(id, err);
  }
};
