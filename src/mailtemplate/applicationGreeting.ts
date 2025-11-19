export const applicationGreetingTemplate = (name: string) => `
  <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 24px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="color: #1d4ed8;">Hi ${name || "Applicant"},</h2>
      <p style="font-size: 16px; color: #374151;">
        Thank you for applying for a position with <strong>Plaza Sales</strong>.
      </p>
      <p style="font-size: 16px; color: #374151;">
        We’ve successfully received your application and our HR team will review it shortly.
        If your profile matches our requirements, we’ll reach out to you for the next steps.
      </p>
      <p style="font-size: 16px; color: #374151;">Meanwhile, feel free to explore our latest openings and company updates on our website.</p>
      <br />
      <p style="color: #1d4ed8; font-weight: 600;">Best Regards,</p>
      <p style="color: #111827;">The Plaza Sales HR Team</p>
      <hr style="margin-top: 24px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 13px; color: #6b7280; text-align: center;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;
