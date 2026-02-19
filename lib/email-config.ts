
const senderDomain = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.split('@')[1] : 'resend.dev';

export const EMAIL_SENDERS = {
    auth: {
        name: 'SafeCloud Auth',
        email: `auth@${senderDomain}`
    },
    security: {
        name: 'SafeCloud Security',
        email: `security@${senderDomain}`
    },
    support: {
        name: 'SafeCloud Support',
        email: `support@${senderDomain}`
    },
    onboarding: {
        name: 'SafeCloud Onboarding',
        email: `onboarding@${senderDomain}`
    },
    noreply: {
        name: 'SafeCloud',
        email: `noreply@${senderDomain}`
    }
};
