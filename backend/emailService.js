import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export const sendVCFEmail = async (filePath, userId) => {
  await transporter.sendMail({
    from: `"Genomics Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.TO_EMAIL,
    subject: `[VCF_UPLOAD:${userId}]`,
    text: 'VCF file attached.',
    attachments: [
      {
        filename: 'user_upload.vcf',
        path: filePath,
      },
    ],
  })

  console.log(`📤 Sent email with user ID ${userId}`)
}
