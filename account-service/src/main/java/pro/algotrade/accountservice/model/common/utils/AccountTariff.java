package pro.algotrade.accountservice.model.common.utils;

public enum AccountTariff {
    INVESTOR("investor"),
    TRADER("trader"),
    DEMO("demo");

    private final String tariff;

    AccountTariff(String tariff) {
        this.tariff = tariff;
    }

    public String getTariff() {
        return tariff;
    }
}
