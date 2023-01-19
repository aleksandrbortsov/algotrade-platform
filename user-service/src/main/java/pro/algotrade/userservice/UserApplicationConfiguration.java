package pro.algotrade.userservice;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.client.RestTemplate;

@Configuration
public class UserApplicationConfiguration {

    @Bean
    public ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames("message/exception", "message/notification");
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }

    @Bean
    public RestTemplate restTemplate () {
        return new RestTemplate();
    }
}
