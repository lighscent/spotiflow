!macro customInit
  ; Ask user if they want auto-start
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want Spotiflow to start automatically when you log in?" IDYES autostart IDNO noautostart
  
  autostart:
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotiflow" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    Goto done
  
  noautostart:
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotiflow"
  
  done:
!macroend

!macro customUnInit
  ; Remove from startup
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotiflow"
!macroend