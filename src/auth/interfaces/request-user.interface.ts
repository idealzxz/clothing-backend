export interface RequestUser {
  userId: string;
  openid: string;
  agreementConfirmed: boolean;
  agreementVersion: string | null;
}
