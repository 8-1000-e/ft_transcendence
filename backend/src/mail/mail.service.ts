import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer"

@Injectable()
export class MailService
{
    private transporter: nodemailer.Transporter

    constructor(private readonly config: ConfigService)
    {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.config.get("GMAIL_USER"),
                pass: this.config.get("GMAIL_APP_PASSWORD")
            }
        })
    }

    async sendVerificationEmail(to: string, code: string)
    {
        await this.transporter.sendMail({
            from: this.config.get("GMAIL_USER"),
            to: to,
            subject: "YOUR VERIFICATION CODE",
            text: `Your code is: ${code}\nValid for 15min`
        })
    }
}