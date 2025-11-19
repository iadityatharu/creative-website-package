interface ContactReplyData {
  name: string;
  purpose: string;
  message: string;
  repliedBy: string;
}

export function contactReplyMailTemplate(data: ContactReplyData): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reply from Plaza Sales</title>
      <style>
        body {
          font-family: "Arial", sans-serif;
          background-color: #f8f9fa;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          background: #fff;
          margin: 20px auto;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #da2b34;
          color: #fff;
          text-align: center;
          padding: 20px;
        }
        .header img {
          width: 80px;
          height: auto;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px;
        }
        .content p {
          font-size: 15px;
          line-height: 1.6;
        }
        .footer {
          background: #f1f1f1;
          text-align: center;
          padding: 15px;
          font-size: 13px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://pub-969c218ddb2f4a29bbe25940c8760402.r2.dev/uploads/main-logo.png" alt="Plaza Sales" />
          <h2>Plaza Sales</h2>
        </div>

        <div class="content">
          <h3>📩 Reply Regarding Your Inquiry</h3>
          <p>Dear ${data.name},</p>
          <p>We have reviewed your inquiry related to <strong>${
            data.purpose
          }</strong>.</p>
          <p><strong>Message:</strong></p>
          <p style="background:#f5f5f5; padding:10px; border-radius:5px;">${
            data.message
          }</p>
          <p>Replied by: <strong>${data.repliedBy}</strong></p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Plaza Sales. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}
