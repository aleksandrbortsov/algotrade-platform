package pro.algotrade.personservice;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

@Configuration
public class PersonApplicationConfiguration {

    @Bean
    public ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames("message/exception_message");
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }
}
