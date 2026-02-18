import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

        const { data, error } = await resend.emails.send({
            from: `SafeCloud <${fromEmail}>`,
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
