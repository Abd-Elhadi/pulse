export const validateEmail = (email: string): boolean => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
};

export const validatePassword = (
    password: string,
): {valid: boolean; message?: string} => {
    if (password.length < 8) {
        return {
            valid: false,
            message: "Password must be at least 8 characters",
        };
    }
    return {valid: true};
};

export const validateName = (
    name: string,
): {valid: boolean; message?: string} => {
    if (name.trim().length < 2) {
        return {valid: false, message: "Name must be at least 2 characters"};
    }
    return {valid: true};
};
