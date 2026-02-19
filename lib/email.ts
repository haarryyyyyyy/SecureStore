import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
    to,
    subject,
    html,
    sender = { name: 'SafeCloud', email: process.env.EMAIL_FROM || 'onboarding@resend.dev' }
}: {
    to: string,
    subject: string,
    html: string,
    sender?: { name: string, email: string }
}) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error("Resend Error:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};
