package pro.algotrade.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import pro.algotrade.authservice.dto.UserDetailsDto;
import org.springframework.http.HttpHeaders;

@Service
@RequiredArgsConstructor
@Log4j2
public class UserDtoService {
    public static final String API_GATEWAY_URL = "http://localhost:3535";
    public static final String API_USERSDETAILS_URL = "/internal/userdetails";

//    private final RestTemplate restTemplate;

    public UserDetailsDto getUserDto(String username) {
//        UserDetailsDto user =;

        var headers = new HttpHeaders();
        headers.set("Authorization", "Service $serviceToken");

//        ResponseEntity<String> response =
//            restTemplate.exchange(API_GATEWAY_URL + API_USERSDETAILS_URL + username, HttpMethod.GET,
//                new HttpEntity<>(headers), new ParameterizedTypeReference<>() {
//                });


        log.info("User from person-service: {}");

        return null;
    }
}
