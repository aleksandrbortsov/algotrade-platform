package pro.algotrade.userservice.utility;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Path;

@Component
public class QrCodeGenerator {

    private static final String QR_CODE_IMAGE_PATH = "C:\\Projects\\Trainings\\AlgoTradePlatform\\user-service\\src\\main\\resources\\static\\image\\imageQRCode.png";

    public void asImage(String text,
                        int width,
                        int height) throws WriterException, IOException {
        BitMatrix bitMatrix = getBitMatrix(text, width, height);
        Path path = FileSystems.getDefault().getPath(QR_CODE_IMAGE_PATH);
        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", path);
    }

    public byte[] asByteArray(String text, int width, int height) throws WriterException, IOException {
        BitMatrix bitMatrix = getBitMatrix(text, width, height);
        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageConfig imageConfig = new MatrixToImageConfig(0xFF000002, 0xFFFFC041);
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream, imageConfig);

        // Convert Byte Array into Base64 Encode String
//        String qrcode = Base64.getEncoder().encodeToString(qrCode);

        return pngOutputStream.toByteArray();
    }

    private BitMatrix getBitMatrix(String text, int width, int height) throws WriterException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();

        return qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
    }

}
