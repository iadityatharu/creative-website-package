export interface ResetPasswordMailData {
  name: string;
  resetLink: string;
}

export function resetPasswordMailTemplate(data: ResetPasswordMailData): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Your Password - Plaza Sales</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: "Helvetica Neue", Arial, sans-serif;
          background-color: #f8f9fa;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #DA2B34;
          color: #fff;
          text-align: center;
          padding: 25px 15px;
        }
        .header img {
          width: 80px;
          height: auto;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 25px;
          line-height: 1.6;
        }
        .content h2 {
          color: #DA2B34;
          margin-top: 0;
          font-size: 20px;
        }
        .content p {
          font-size: 15px;
          color: #444;
        }
        .info-box {
          background-color: #f1f3f5;
          border-left: 4px solid #DA2B34;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }
        .btn {
          display: inline-block;
          background-color: #DA2B34;
          color: #fff;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: bold;
          margin-top: 20px;
        }
        .footer {
          background: #f1f1f1;
          text-align: center;
          padding: 15px;
          font-size: 13px;
          color: #666;
        }
        @media screen and (max-width: 600px) {
          .container {
            margin: 15px;
          }
          .content {
            padding: 20px;
          }
          .header h1 {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://pub-969c218ddb2f4a29bbe25940c8760402.r2.dev/uploads/main-logo.png" alt="Plaza Sales Logo" />
          <h1>Password Reset Request</h1>
        </div>

        <div class="content">
          <h2>Hello ${data.name},</h2>
          <p>We received a request to reset your password for your <strong>Plaza Sales</strong> account.</p>

          <div class="info-box">
            <p>Click the button below to reset your password:</p>
          </div>

          <a href="${data.resetLink}" class="btn">Reset Password</a>

          <p style="margin-top: 20px;">⚠️ This link will expire in 5 minutes. If you did not request a password reset, please ignore this email or contact support immediately.</p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Plaza Sales. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}
