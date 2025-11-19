import { ContactPurpose } from "../constant/enum.constant";

interface ContactMailData {
  fullname?: string;
  email?: string;
  organization?: string;
  phoneNo?: string;
  address?: string;
  message?: string;
  purpose?: ContactPurpose;
}

export function contactMailTemplate(data: ContactMailData): string {
  const details: Array<{ label: string; value?: string }> = [
    { label: "Name", value: data.fullname },
    { label: "Email", value: data.email },
    { label: "Phone", value: data.phoneNo },
    { label: "Organization", value: data.organization },
    { label: "Purpose", value: data.purpose },
    { label: "Address", value: data.address },
    { label: "Message", value: data.message },
  ];

  const detailRows = details
    .filter(({ value }) => value !== undefined && value !== null && value !== "")
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600; width: 30%;">${label}</td>
          <td style="padding: 8px 12px; border: 1px solid #eee;">${value}</td>
        </tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Contact Inquiry - Plaza Sales</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f6f8fb;
          color: #111827;
        }
        .container {
          max-width: 640px;
          margin: 20px auto;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #f0f0f0;
        }
        .header {
          background: #da2b34;
          color: #ffffff;
          text-align: center;
          padding: 24px 16px;
        }
        .header img {
          width: 80px;
          height: auto;
          margin-bottom: 12px;
        }
        .content {
          padding: 24px;
        }
        .content h2 {
          margin-top: 0;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .footer {
          padding: 16px;
          text-align: center;
          font-size: 13px;
          color: #6b7280;
          background: #f8f9fb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://pub-969c218ddb2f4a29bbe25940c8760402.r2.dev/uploads/main-logo.png" alt="Plaza Sales Logo" />
          <h1>New Contact Inquiry</h1>
        </div>
        <div class="content">
          <p>You have received a new contact inquiry via the Plaza Sales website.</p>
          <table>
            <tbody>
              ${detailRows}
            </tbody>
          </table>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Plaza Sales. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}
