package util;

import net.masterthought.cucumber.Configuration;
import net.masterthought.cucumber.ReportBuilder;
import org.apache.commons.io.FileUtils;
import org.jasypt.util.text.AES256TextEncryptor;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

public class Helper {
    private static final Map<String, Object> mapGlobal = new ConcurrentHashMap<>(10);

    /**
     * Retourne la date du jour augmentée de x jours
     *
     * @param iniDay nombre de jour à ajouter
     * @return nouvelle date
     */
    public static String toDay(int iniDay) {
        LocalDateTime dtNow = LocalDateTime.now();

        dtNow = dtNow.plusDays(iniDay);
        return DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(dtNow);
    }

    /**
     * Retourne la date du jour augmentée de x jours au format demandé
     *
     * @param iniDay    nombre de jour à ajouter
     * @param insFormat Format de la date retournée
     * @return nouvelle date formatée
     */
    public static String toDay(int iniDay, String insFormat) {
        LocalDateTime dtNow = LocalDateTime.now();

        dtNow = dtNow.plusDays(iniDay);
        return DateTimeFormatter.ofPattern(insFormat).format(dtNow);
    }

    /**
     * Mémorise la valeur avec son nom
     *
     * @param insKey   Nom pour accèder à la valeur
     * @param inoValue Valeur à mémoriser
     * @return la clef
     */
    public static String saveValue(String insKey, Object inoValue) {
        if (insKey == null || insKey.isEmpty() || inoValue == null)
            return "null not permitted";

        mapGlobal.put(insKey, inoValue);
        return insKey;
    }

    /**
     * Retourne la valeur associée à la clef
     *
     * @param insKey Clef pour accèder à la valeur
     * @return la valeur
     */
    public static Object getValue(String insKey) {
        if (insKey == null || insKey.isEmpty())
            return "not found";

        return mapGlobal.get(insKey);
    }

    /**
     * Retourne la liste des valeurs avec cette clef
     *
     * @param insKey Clef pour accèder à la valeur
     * @param insText Texte à ajouter au début
     * @return la valeur
     */
    public static String getValues(String insKey, String insText) {
        return getValues(insKey, insText, false);
    }

    /**
     * Retourne la liste des valeurs avec cette clef
     *
     * @param insKey Clef pour accèder à la valeur
     * @param insText Texte à ajouter au début
     * @param inbList true--> mode liste
     * @return la valeur
     */
    public static String getValues(String insKey, String insText, boolean  inbList) {
        if (insKey == null || insKey.isEmpty())
            return "not found";
        final StringBuilder sbAnswer = new StringBuilder();
        final boolean       bText = (insText != null && ! insText.isEmpty());
        if ( inbList ) {
            sbAnswer.append("[");
            if (bText)
                sbAnswer.append(insText).append(",");
        } else {
            if (bText) {
                if (insText.endsWith("}"))
                    insText = insText.substring(0, insText.length() - 1);
                if (!insText.startsWith("{"))
                    sbAnswer.append("{");
                sbAnswer.append(insText).append(",");
            } else
                sbAnswer.append("{");
        }
        mapGlobal.keySet().forEach(sKey -> {
            if ( sKey.startsWith(insKey) ) {
                if ( inbList )
                    sbAnswer.append(mapGlobal.get(sKey)).append(",");
                else
                    sbAnswer.append("\"").append(sKey).append("\": ").append(mapGlobal.get(sKey)).append(",");
            }
        });
        if ( sbAnswer.length() > 2 )
            sbAnswer.deleteCharAt(sbAnswer.length()-1);
        if ( inbList )
            sbAnswer.append("]");
        else
            sbAnswer.append("}");

        return sbAnswer.toString();
    }

    /**
     * Retourne le nombre de clef trouvée
     *
     * @param insKey Clef pour accèder à la valeur
     * @return la valeur
     */
    public static int countValues(String insKey) {
        if (insKey == null || insKey.isEmpty()) return 0;

        final AtomicInteger iFound = new AtomicInteger();

        mapGlobal.keySet().forEach(sKey -> {
            if ( sKey.startsWith(insKey) )
                iFound.getAndIncrement();
        });
        return iFound.get();
    }

    /**
     * Retourne la basic authentification
     *
     * @param insUser login
     * @param insPwd  password
     * @return Basic authentification
     */
    public static String getBasicAuthentification(final String insUser, final String insPwd) {
        final String sPwd  = decryptData(insPwd, insUser);
        final String sTemp = insUser + ":" + sPwd;

        return "Basic " + Base64.getEncoder().encodeToString(sTemp.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Retourne la basic authentification
     *
     * @param insTag login
     * @param insValue  password
     * @return Key authentification
     */
    public static String getKeyAuthentification(final String insTag, final String insValue) {
        return insTag + " " + Base64.getEncoder().encodeToString(insValue.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Déchiffre les données
     *
     * @param insData données chiffrées
     * @param insSalt Clef secrète
     * @return Données en clair
     */
    public static String decryptData(String insData, String insSalt) {
        final AES256TextEncryptor oDecryptor = new AES256TextEncryptor();

        oDecryptor.setPassword(insSalt);
        return oDecryptor.decrypt(insData);
    }

    /**
     * Chiffre les données
     *
     * @param insData données à chiffrer
     * @param insSalt Clef secrète
     * @return Données chiffrées
     */
    public static String encryptData(String insData, String insSalt) {
        final AES256TextEncryptor   oEncryptor = new AES256TextEncryptor();

        System.out.println("Original Value : " + insData);
        oEncryptor.setPassword(insSalt);
        final String sResult = oEncryptor.encrypt(insData);

        System.out.println("Crypted Value : " + sResult);
        return sResult;
    }

    /**
     * Generation du rapport Cucumber
     * @param insProjet
     * @param insOutputDir
     */
    public static void generateReport(String insProjet, String insOutputDir) {
        final Configuration       oConfig = new Configuration(new File("target"), insProjet);

        oConfig.setDirectorySuffix(insProjet);
        final Collection<File>    listJsonFile = FileUtils.listFiles(new File(insOutputDir), new String[] { "json" }, true);
        final List<String>        listPath = new ArrayList<>(listJsonFile.size());

        listJsonFile.forEach(oFile -> listPath.add(oFile.getAbsolutePath()));
        final ReportBuilder       oReportBuilder = new ReportBuilder(listPath, oConfig);

        oReportBuilder.generateReports();
    }

    public static String getKarateEnv(){
        return System.getProperty("karate.env");
    }

    /**
     * Compare 2 images et sauve le résultat dans une image
     * @param insExpected Image attendue: référence
     * @param insActual Image à comparer
     * @param insResult Image résultat avec rectangle rouge sur les différences
     * @return Pourcentage 100% --> idendiques
     */
    public static float compareScreenShot(final String insExpected, final String insActual, final String insResult){
  /*       //load images to be compared:
  final File          fWorkingDir = (new File("")).getAbsoluteFile();
  final Resource      fExpected = ResourceUtils.getResource(fWorkingDir, insExpected);
  final Resource      fActual = ResourceUtils.getResource(fWorkingDir, insActual);
  final BufferedImage imgExpected = ImageComparisonUtil.readImageFromResources(fExpected.getFile().getPath());
  final BufferedImage imgActual   = ImageComparisonUtil.readImageFromResources(fActual.getFile().getPath());
  final File          fResult = new File(insResult); // where to save the result into image
  //Create ImageComparison object with result destination and compare the images.
  ImageComparisonResult imageComparisonResult = new ImageComparison(imgExpected, imgActual, fResult).compareImages();

        //Check the result
        return imageComparisonResult.getDifferencePercent();
  */      return 0.0F;
    }

    /**
     * Compare le texte: la référence peut avoir un masque XX --> ignore
     * @param insExpected Texte de référence (avec ou sans masque)
     * @param insActual Texte à comparer
     * @return Boolean true si identique
     */
    public static boolean compareText(final String insExpected, final String insActual) {
        if ( insExpected == null || insExpected.isEmpty() )
            return false;
        if ( insActual == null || insActual.isEmpty() )
            return false;
        String  sRef = insExpected.trim().replaceAll("([\\r\\n\\t])", "").replaceAll(" {2}", "");
        String  sCheck = insActual.trim().replaceAll("([\\r\\n\\t])", "").replaceAll(" {2}", "");

        for(int iX = 0; iX < sRef.length(); iX++) {
            if ( sRef.charAt(iX) != sCheck.charAt(iX) && sRef.charAt(iX) != '#') {
                System.out.println("Comparing failed at position: " + iX);
                System.out.println("Reference: " + sRef);
                System.out.println("Answer   : " + sCheck);
                return false;
            }
        }
        return true;
    }

    public static String logMemory(final String insLabel) {
        System.gc();
        final Runtime   rtRunTime = Runtime.getRuntime();
        final long      lMaxMB = rtRunTime.maxMemory() / 1024 / 1024;
        final long      lUsedMB = rtRunTime.totalMemory() / 1024 / 1024;
        final long      lFreeMB = rtRunTime.freeMemory() / 1024 / 1024;
        final String    sMsg = insLabel + " - max memory: " + lMaxMB + "MB - memory usage:" + lUsedMB + "MB - memory free:" + lFreeMB + "MB";

        System.out.println(sMsg);
        return sMsg;
    }

    /**
     *
     * @return la date du jour au format string YYYYMMDD
     */
    public static String getDateDeuxEnArriere(){
        DateTimeFormatter formatters = DateTimeFormatter.ofPattern("yyyyMMdd");
        LocalDate localDate = LocalDate.now();
        localDate = localDate.minusYears(2);
        return localDate.format(formatters);
    }

    /**
     *
     * @return Une date de type String au format YYYY-MM-DD
     */
    public static String reverseDate(String date){
        DateTimeFormatter formatters = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        LocalDate localDate = LocalDate.parse(date,formatters);
        System.out.println("test " + localDate);
        return  localDate.toString();
    }

    public static String generateFileNameWithTimestamp(String filename){
        Date currentDate = new Date (Instant.now().toEpochMilli());
        SimpleDateFormat dateFormat = new SimpleDateFormat("YYYYMMdd_HHmmss");
        return dateFormat.format(currentDate)+"_"+filename;
    }


    public static String formatDateJour(){
        LocalDate date = LocalDate.parse(LocalDate.now().toString());

        // Créer un formatteur avec le format souhaité (dd.MM.yyyy)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        // Appliquer le formatteur à la date
        String formattedDate = date.format(formatter);

        return formattedDate.toString();
    }


    public static LocalDate randomDateBetween(LocalDate min, LocalDate max) {
        long minEpochDay = min.toEpochDay();
        long maxEpochDay = max.toEpochDay();
        long randomDay = ThreadLocalRandom.current().nextLong(minEpochDay, maxEpochDay + 1);
        return LocalDate.ofEpochDay(randomDay);
    }

}