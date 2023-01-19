package pro.algotrade.userservice.service.impl;

import lombok.RequiredArgsConstructor;
//import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import pro.algotrade.userservice.service.NotificationService;

@Service
@RequiredArgsConstructor
public class MailServiceImpl implements NotificationService {
//    private final KafkaTemplate<String, String> kafkaTemplate;
//
//    @Override
//    public void sentNotification(UserEntity userEntity) {
//        kafkaTemplate.send("mails", "user.creation: " + userEntity.toString());
//    }
}
