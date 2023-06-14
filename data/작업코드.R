
##################################################################################################
## 드디어 정리
##################################################################################################

library(data.table)
library(dplyr)
library(tidyr)
library(reshape2)

rm(list = ls())
gc()

### 부강초를 수정하였으므로 다시 정리
### 과거의 황전북초등학교회덕분교장 -> 황전초등학교회덕분교장으로 이름 변경
### 과거의 황전북초등학교 -> 황전초등학교대치분교장으로 이름 변경
### 이 작업은 파일에서 수동으로 함
#https://www.law.go.kr/%EC%9E%90%EC%B9%98%EB%B2%95%EA%B7%9C/%EC%A0%84%EB%9D%BC%EB%82%A8%EB%8F%84%EB%A6%BD%ED%95%99%EA%B5%90%EC%84%A4%EC%B9%98%EC%A1%B0%EB%A1%80/
# 관련하여 2023년 릴리즈 자료 등 여러개에서 수동으로 수정함
#방지초분명분교 -> 분교장으로 수정
#백일초 -> 성진초
#군산소룡초 -> 소룡초
#광주불로초 -> 불로초

sourceFolder <- "./"

elem <- fread(paste0(sourceFolder, "05_전체학교목록.tsv"),
                             #quote="\"", 
                             encoding="UTF-8",
                             select = c(1:22),
                             colClasses = list(character = c(1:9),
                                               numeric = c(10:22)
                             ),
                             #col.names = c('sido', 'gu', 'name'),   
                             sep = "\t", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)


data2 <- elem %>% select(조사기준일,시도,행정구,학교명,학급수_계,학생수_총계_계)
colnames(data2) <- c("yyyymm", "sido","gu","name","classNum","personNum")
data2$year <- substr(data2$yyyymm, 1, 4)
data2 <- data2 %>% select(year, sido, gu, name, classNum, personNum)
data2$classNum <- as.integer(data2$classNum)
data2$personNum <- as.integer(data2$personNum)
data2$name <- gsub(" ", "", data2$name)
dataClass <- data2 %>% select(year, sido, gu, name, classNum)

dataTemp <- dataClass %>%
  reshape2::dcast(sido+gu+name~paste0("class_", year), value.var="classNum", fun.aggregate = sum, fill=0)
dataPerson <- data2 %>% select(year, sido, gu, name, personNum)

dataTemp2 <- dataPerson %>%
  reshape2::dcast(sido+gu+name~paste0("student_", year), value.var="personNum", fun.aggregate = sum, fill=0)
dataMerged <- dataTemp %>% left_join(dataTemp2, by=c("sido", "gu", "name"))


fwrite(dataMerged, file=paste0(sourceFolder, "06_초등학교_학급수학생수.tsv"), sep="\t")



#############################
rm(list = ls())
sourceFolder <- "A:\\work\\202305_초등학교학생수\\최종정리\\"

### 이 파일은 이름을 kess 버젼으로 수정한 것이며, serial 이 매칭되어 있어서, 학교알리미 학교와 연동할 수 있다.
### sido + gu + name으로 kess와 매칭할 수 있다.
### 두 파일 모두 다른 폴더의 파일에서 중복 자료를 수동으로 제거했다.
matching <- fread(paste0(sourceFolder, "00_초등학교_이름등오류 수정.tsv"),
              #quote="\"", 
              encoding="UTF-8",
              select = c(1:6),
              colClasses = list(character = c(1:6)
                                #numeric = c(10:22)
              ),
              col.names = c('addr','id','name','sido_', 'gu', 'sido'),   
              sep = "\t", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)

###
idXY <- fread(paste0(sourceFolder, "01_시리얼번호_종합2023_좌표.tsv"),
                  #quote="\"", 
                  encoding="UTF-8",
                  select = c(1:6),
                  colClasses = list(character = c(1,2,3,6),
                                    numeric = c(4:5)
                  ),
                  col.names = c('id','nameOld','addr','x','y', 'type'),   
                  sep = "\t", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)

matchingID <- unique(matching$id)
matchingGroup <- matching %>% group_by(id) %>% tally()
idXYGroup <- idXY %>% group_by(id) %>% tally()



## 이제 좌표와 이름을 수정된 버젼으로 통합한다.
matched <- idXY %>% left_join(matching %>% select(id, name, sido_, gu, sido), by="id")

## 비어 있는 부분 정리
matched0 <- matched %>% filter(is.na(name))
matched1 <- matched %>% filter(!is.na(name))

matched0[,name:=nameOld]


split_cols <- strsplit(matched0$addr, " ")

matched0$sido_ <- sapply(split_cols, `[`, 1)
matched0$gu <- sapply(split_cols, `[`, 2)

matched0$gu[matched0$sido_=="세종특별자치시"] <- "세종시"

matched0 <- matched0 %>% select(id, nameOld, addr, x, y, type, name, sido_, gu)


sidoAbbr <- data.table()
sidoAbbr$sido_ <- c("서울특별시","부산광역시","대구광역시","인천광역시","대전광역시",
                    "광주광역시","울산광역시","세종특별자치시","제주특별자치도","경기도",
                    "강원도","충청남도","충청북도","전라남도","전라북도",
                    "경상남도","경상북도",
                    "전남","경남","경기","대전","서울","전북","울산","경북","광주")
sidoAbbr$sido <- c("서울","부산","대구","인천","대전","광주","울산","세종","제주","경기",
                   "강원","충남","충북","전남","전북","경남","경북",
                   "전남","경남","경기","대전","서울","전북","울산","경북","광주")

matched0 <- matched0 %>% left_join(sidoAbbr, by=c("sido_"))



matched <- rbindlist(list(matched1, matched0))

rm(matched0, matched1)
rm(idXY, matching, sidoAbbr, split_cols)


### 이제 이 파일에 2023년 학생수 학급수를 붙인다.

###
elem2023 <- fread(paste0(sourceFolder, "04_2023년도_학교 현황.csv"),
              #quote="\"", 
              encoding="UTF-8",
              select = c(4,18,19),
              colClasses = list(character = c(4,18,19)
                                #numeric = c(4:5)
              ),
              col.names = c('id','class_2023','student_2023'),   
              sep = ",", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)


elem2023$class_2023 <- as.integer(sub("\\(.*", "", elem2023$class_2023))
elem2023$student_2023 <- as.integer(sub("\\(.*", "", elem2023$student_2023))


matched <- matched %>% left_join(elem2023, by="id")


matched[is.na(class_2023), class_2023:=0]
matched[is.na(student_2023), student_2023:=0]

fwrite(matched, file=paste0(sourceFolder, "07_매칭기준테이블.tsv"), sep="\t")
rm(elem2023, idXYGroup, matchingGroup, matchingID)



matched[, nameStr:=paste(sido,gu,name)]
##### 이제 기존에 만들었던 연도별 학급수학생수 자료에 조인

###
elem <- fread(paste0(sourceFolder, "06_초등학교_학급수학생수.tsv"),
                  #quote="\"", 
                  encoding="UTF-8",
                  select = c(1:33),
                  colClasses = list(character = c(1:3),
                                    integer = c(4:33)
                  ),
                  #col.names = c('id','class_2023','student_2023'),   
                  sep = "\t", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)



elem[, nameStr:=paste(sido, gu, name)]




matched0 <- matched %>% select(nameStr, addr, id, class_2023, student_2023, x, y)

elem <- elem %>% left_join(matched0, by="nameStr")

#### 현행 유지 학교와 폐교를 분리

elem0 <- elem %>% filter(!is.na(class_2023))
elem1 <- elem %>% filter(is.na(class_2023))


elem1$class_2023 = 0
elem1$student_2023 = 0
elem1$x <- NULL
elem1$y <- NULL
elem1$addr <- NULL



### 폐교 정보 결합
closed <- fread(paste0(sourceFolder, "02_폐교학교_종합_좌표.tsv"),
                  #quote="\"", 
                  encoding="UTF-8",
                  select = c(2,3,4,5,6,7),
                  colClasses = list(character = c(2,3,4,5),
                                    numeric = c(6,7)
                  ),
                  #col.names = c('id','class_2023','student_2023'),   
                  sep = "\t", header = TRUE, stringsAsFactors = FALSE, nThread = 20
)

closed[, nameStr:=paste(sido, gu, name)]

closedGroup <- closed %>% group_by(nameStr) %>% tally()



elem1  <- elem1 %>% left_join(closed%>%select(addr, nameStr, x, y), by="nameStr")
elem1 <- elem1 %>% filter(!is.na(x))

elem1$id = "NONE"

### 이제 마지막 결합
elem0 <- elem0 %>% select(id, name, sido, gu, addr, x, y,
                          class_2008, class_2009, class_2010, class_2011, class_2012,
                          class_2013, class_2014, class_2015, class_2016, class_2017,
                          class_2018, class_2019, class_2020, class_2021, class_2022, class_2023,
                          student_2008, student_2009, student_2010, student_2011, student_2012,
                          student_2013, student_2014, student_2015, student_2016, student_2017,
                          student_2018, student_2019, student_2020, student_2021, student_2022, student_2023)

elem1 <- elem1 %>% select(id, name, sido, gu, addr, x, y,
                          class_2008, class_2009, class_2010, class_2011, class_2012,
                          class_2013, class_2014, class_2015, class_2016, class_2017,
                          class_2018, class_2019, class_2020, class_2021, class_2022, class_2023,
                          student_2008, student_2009, student_2010, student_2011, student_2012,
                          student_2013, student_2014, student_2015, student_2016, student_2017,
                          student_2018, student_2019, student_2020, student_2021, student_2022, student_2023)

elem <- rbindlist(list(elem0, elem1))

setorder(elem, sido, gu, name)

fwrite(elem, file=paste0(sourceFolder, "08_최종정리_학급수학생수_폐교포함.tsv"),sep="\t") 
fwrite(elem, file=paste0(sourceFolder, "schoolInfo.tsv"),sep="\t") 





















