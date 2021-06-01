import { Client } from "./httpClient";
import { Token } from "./types";
import {
  AccountDTO,
  LoginResponse,
  ChangeAccountNameRequest,
  UpdatePasswordRequest,
  AccessTokenDTO,
  Role,
  LoginIpDTO,
  SignUpRequest,
  SignUpResponse,
  HenesisLocaleLanguageEnum,
} from "./__generate__/accounts";
import { makeQueryString } from "./utils/url";

export interface AccountWithOTP extends Account {
  otp?: OTP;
}

export interface Account extends AccountDTO {}

export interface AccountWithIps extends Account {
  loginIps: LoginIpDTO[];
}

export interface AccountLogin extends LoginResponse {}

export interface OTP {
  key: string;
  url: string;
}

export import Role = Role;

export class Accounts {
  private readonly client: Client;

  private readonly baseUrl = "/accounts";

  private readonly DEFAULT_TOKEN_EXPIRED_TIME = 3600;

  constructor(client: Client) {
    this.client = client;
  }

  me(): Promise<Account> {
    return this.client.get<Account>(`${this.baseUrl}/me`);
  }

  login(
    email: string,
    password: string,
    otpCode?: string
  ): Promise<AccountLogin> {
    return this.client.post<AccountLogin>(`${this.baseUrl}/login`, {
      email,
      password,
      otpCode,
    });
  }

  async signup(params: SignUpRequest): Promise<SignUpResponse> {
    return await this.client.post<SignUpResponse>(
      `${this.baseUrl}/signup`,
      params
    );
  }

  async verifyEmail(email: string) {
    await this.client.post(`${this.baseUrl}/verify-email`, { email });
  }

  async verify(params: {
    identifier: string;
    accountId: string;
  }): Promise<void> {
    const queryString = makeQueryString({
      identifier: params.identifier,
      account_id: params.accountId,
    });
    await this.client.get(
      `${this.baseUrl}/login/verify${queryString ? `?${queryString}` : ""}`
    );
  }

  async changeName(firstName: string, lastName: string): Promise<void> {
    const params: ChangeAccountNameRequest = {
      firstName,
      lastName,
    };
    await this.client.patch<AccountDTO>(`${this.baseUrl}/name`, params);
  }

  async changePassword(
    password: string,
    newPassword: string,
    otpCode?: string
  ): Promise<void> {
    const params: UpdatePasswordRequest = {
      newPassword,
      password,
      otpCode,
    };
    await this.client.patch(`${this.baseUrl}/password`, params);
  }

  createAccessToken(expiresIn?: number): Promise<Token> {
    const requestExpiresIn = expiresIn || this.DEFAULT_TOKEN_EXPIRED_TIME;
    return this.client.post<AccessTokenDTO>(`${this.baseUrl}/token`, {
      expiresIn: requestExpiresIn,
    });
  }

  refreshShortAccessToken(otpCode?: string): Promise<Token> {
    return this.client.post<AccessTokenDTO>(
      `${this.baseUrl}/token?type=short`,
      {
        otpCode,
      }
    );
  }

  getAccessToken(): Promise<Token> {
    return this.client.get<AccessTokenDTO>(`${this.baseUrl}/token`);
  }

  async updateLanguage(newLanguage: HenesisLocaleLanguageEnum) {
    await this.client.patch(`${this.baseUrl}/language`, {
      newLanguage,
    });
  }
}
