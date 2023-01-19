package pro.algotrade.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.time.DateUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import pro.algotrade.notificationservice.service.MailService;

@Service
@Slf4j
@RequiredArgsConstructor
public class BirthdayListenerService {

    private final MailService mailService;
    @Scheduled(fixedDelay = DateUtils.MILLIS_PER_DAY)
    public void process() {
        log.info("BirthdayListenerService is executed");
//      from  https://habr.com/ru/post/658973/
//        var headers = HttpHeaders();
//        headers.set("Authorization", "Service $serviceToken")
//
//        val restTemplate = RestTemplate()
//        val response = restTemplate.exchange(
//                "http://localhost:8087/internal/users",
//                HttpMethod.GET,
//                HttpEntity<Any>(headers),
//                object : ParameterizedTypeReference<List<String>>() {})
//        logger.info { "TODO: notify user: ${response.body}" }

        mailService.sendEmailWithAttachment();
    }
}
