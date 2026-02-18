
const styles = {
    container: `
        font-family: 'Segoe UI', user-select, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
        max-width: 580px;
        margin: 0 auto;
        color: #1e293b;
        line-height: 1.6;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
    `,
    header: `
        background-color: #0f172a;
        padding: 24px;
        text-align: center;
    `,
    logo: `
        color: #ffffff;
        font-size: 20px;
        font-weight: 700;
        text-decoration: none;
        letter-spacing: 0.5px;
    `,
    body: `
        padding: 32px 24px;
        background-color: #ffffff;
    `,
    footer: `
        background-color: #f8fafc;
        padding: 24px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
    `,
    button: `
        display: inline-block;
        background-color: #2563eb;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        margin: 16px 0;
        font-size: 14px;
    `,
    otpBox: `
        background-color: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        font-size: 32px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-weight: 700;
        letter-spacing: 8px;
        margin: 24px 0;
        color: #0f172a;
    `,
    h1: `
        margin-top: 0;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 16px;
    `,
    text: `
        margin-bottom: 16px;
        font-size: 15px;
        color: #334155;
    `,
    alertBox: `
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        padding: 16px;
        margin: 20px 0;
        color: #991b1b;
        font-size: 14px;
    `
};

const Layout = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
        <div style="${styles.container}">
            <div style="${styles.header}">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="${styles.logo}">
                    SecureStore
                </a>
            </div>
            <div style="${styles.body}">
                ${content}
            </div>
            <div style="${styles.footer}">
                <p style="margin: 0 0 8px 0;">Secured by Zero-Knowledge Encryption</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} SecureStore. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
`;

export const emailTemplates = {
    otpEmail: (otp: string) => Layout(`
        <h1 style="${styles.h1}">Verify Your Email</h1>
        <p style="${styles.text}">Thank you for creating an account with SecureStore. To complete your registration, please verify your email address.</p>
        <p style="${styles.text}">Enter the following code to activate your account:</p>
        
        <div style="${styles.otpBox}">${otp}</div>
        
        <p style="${styles.text} font-size: 13px; color: #64748b;">This code works for 10 minutes. If you did not request this, please ignore this email.</p>
    `),

    welcomeEmail: (email: string) => Layout(`
        <h1 style="${styles.h1}">Welcome to SecureStore</h1>
        <p style="${styles.text}">Your secure vault has been successfully set up.</p>
        <p style="${styles.text}">We use industry-standard Zero-Knowledge encryption to protect your files. This means only you hold the keys to decrypt your data.</p>
        
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <strong style="color: #0369a1; display: block; margin-bottom: 4px;">Important Reminder</strong>
            <p style="margin: 0; font-size: 14px; color: #0c4a6e;">We cannot recover your password or files if you lose your credentials. Please ensure your <strong>Recovery Code</strong> is stored safely offline.</p>
        </div>

        <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="${styles.button}">Access My Vault</a>
        </div>
    `),

    passwordChangeEmail: () => Layout(`
        <h1 style="${styles.h1}">Password Changed</h1>
        <p style="${styles.text}">The password for your SecureStore account was recently changed.</p>
        
        <div style="${styles.alertBox}">
            <strong>Security Alert:</strong> If you did not make this change, your account may be compromised. Please assume your vault data is at risk and contact support or use your Recovery Code immediately.
        </div>
        
        <p style="${styles.text}">If you made this change, no further action is required.</p>
    `),

    recoverySuccessEmail: () => Layout(`
        <h1 style="${styles.h1}">Account Recovered</h1>
        <p style="${styles.text}">Your account access has been restored successfully using your Recovery Code.</p>
        <p style="${styles.text}">As a security measure, your vault has been re-keyed with your new password.</p>
        
        <p style="${styles.text}"><strong>Action Required:</strong> Your old Recovery Code is now invalid. Please log in and download your new Recovery Code from the Security tab.</p>
        
        <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="${styles.button}">Log In Now</a>
        </div>
    `)
};
