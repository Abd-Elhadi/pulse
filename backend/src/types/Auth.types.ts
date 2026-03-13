export interface RegisterRequestBody {
    email: string;
    password: string;
    displayName: string;
}

export interface LoginRequestBody {
    email: string;
    password: string;
}

export interface RefreshRequestBody {
    refreshToken: string;
}

export interface AuthResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        displayName: string;
        avatarUrl: string;
        bio: string;
        xp: number;
        streak: {current: number; lastActive: Date};
        role: "admin" | "user";
    };
}

export interface MessageResponse {
    message: string;
}
