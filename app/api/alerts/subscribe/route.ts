import { requestAlertChange } from '../_request';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  return requestAlertChange(req, 'subscribe');
}
