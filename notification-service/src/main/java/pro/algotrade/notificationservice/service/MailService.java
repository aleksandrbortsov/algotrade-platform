package pro.algotrade.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.MessagingException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender javaMailSender;

    public void sendEmail() {

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo("alexandr.s.bortsov@gmail.com", "basbox@mail.ru");

        msg.setSubject("Testing from Spring Boot");
        msg.setText("Hello World \n Spring Boot Email");

        javaMailSender.send(msg);
    }

    public void sendEmailWithAttachment() {

        MimeMessage msg = javaMailSender.createMimeMessage();

        try {
            // true = multipart message
            MimeMessageHelper helper = new MimeMessageHelper(msg, true);

            InternetAddress address1 = new InternetAddress("alexandr.s.bortsov@gmail.com");
//            InternetAddress address2 = new InternetAddress("basbox@mail.ru");

//            InternetAddress[] emails = {address1, address2};
            helper.setTo(address1);

            helper.setSubject("Testing from Spring Boot");

            // default = text/plain
            // true = text/html
            helper.setText("<h1>Check attachment for image!</h1>", true);

            // hard coded a file path
            //FileSystemResource file = new FileSystemResource(new File("path/android.png"));


            helper.addAttachment("qr-code.png", new ClassPathResource("/static/image/imageQRCode.png"));
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }

        javaMailSender.send(msg);
    }
}
