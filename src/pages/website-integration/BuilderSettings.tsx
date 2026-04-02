/**
 * Builder Settings Page
 * Allows printers to customize their public builder appearance and behavior
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Loader2, 
  Upload, 
  Settings2, 
  Wrench, 
  Palette, 
  MoreHorizontal,
  Save,
  RotateCcw,
  Info,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPrinter, Printer } from "@/services/printerService";
import { 
  getBuilderSettings, 
  saveBuilderSettings 
} from "@/services/builderSettingsService";
import { 
  BuilderSettings, 
  BuilderSettingsInput,
  DEFAULT_BUILDER_SETTINGS,
  RESOLUTION_LEVELS,
  ImageTrimMode,
  SizeUnit,
  ButtonStyle,
  GOOGLE_FONTS,
  BUTTON_STYLE_OPTIONS
} from "@/types/builderSettings";
import { FormSkeleton } from "@/components/Skeletons";

interface BuilderSettingsPageProps {
  context?: 'wi' | 'qs';
}

const BuilderSettingsPage = ({ context = 'wi' }: BuilderSettingsPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [settings, setSettings] = useState<BuilderSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Modal state for "remove from defaults" confirmation
  const [pendingDefaultsOff, setPendingDefaultsOff] = useState<'uploads' | 'sheet_settings' | 'tools' | 'appearance' | 'others' | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Only show loading spinner on first load, not on tab revisit
      const isFirstLoad = !printer;
      if (isFirstLoad) setIsLoading(true);

      try {
        // Load printer
        const printerResult = await getPrinter(user.id);
        if (!printerResult.success || !printerResult.data) {
          if (isFirstLoad) toast.error("Please set up your store first");
          setIsLoading(false);
          return;
        }
        setPrinter(printerResult.data);

        // Load settings
        const settingsResult = await getBuilderSettings(printerResult.data.id, context);
        if (settingsResult.success && settingsResult.data) {
          setSettings(settingsResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isFirstLoad) toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Update a setting value
  const updateSetting = <K extends keyof BuilderSettings>(
    key: K, 
    value: BuilderSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  // Toggle section defaults
  const toggleSectionDefaults = (
    section: 'uploads' | 'sheet_settings' | 'tools' | 'appearance' | 'others',
    useDefaults: boolean
  ) => {
    if (!settings) return;
    
    const key = `${section}_use_defaults` as keyof BuilderSettings;
    
    if (useDefaults) {
      // Reset the section's values to defaults when toggling ON
      const sectionDefaults: Partial<BuilderSettings> = {};
      
      switch (section) {
        case 'uploads':
          Object.assign(sectionDefaults, {
            auto_resize_to_300dpi: DEFAULT_BUILDER_SETTINGS.auto_resize_to_300dpi,
            enable_transparent_pixel_warning: DEFAULT_BUILDER_SETTINGS.enable_transparent_pixel_warning,
            enable_trim_warning: DEFAULT_BUILDER_SETTINGS.enable_trim_warning,
          });
          break;
        case 'sheet_settings':
          Object.assign(sectionDefaults, {
            size_unit: DEFAULT_BUILDER_SETTINGS.size_unit,
            max_height_inches: DEFAULT_BUILDER_SETTINGS.max_height_inches,
            max_sheets: DEFAULT_BUILDER_SETTINGS.max_sheets,
            default_margin_inches: DEFAULT_BUILDER_SETTINGS.default_margin_inches,
          });
          break;
        case 'tools':
          Object.assign(sectionDefaults, {
            image_trim_mode: DEFAULT_BUILDER_SETTINGS.image_trim_mode,
            enable_background_remover: DEFAULT_BUILDER_SETTINGS.enable_background_remover,
            resolution_optimal_dpi: DEFAULT_BUILDER_SETTINGS.resolution_optimal_dpi,
            resolution_good_dpi: DEFAULT_BUILDER_SETTINGS.resolution_good_dpi,
            resolution_bad_dpi: DEFAULT_BUILDER_SETTINGS.resolution_bad_dpi,
            resolution_terrible_dpi: DEFAULT_BUILDER_SETTINGS.resolution_terrible_dpi,
            hide_terrible_resolution: DEFAULT_BUILDER_SETTINGS.hide_terrible_resolution,
            disallow_lower_resolution: DEFAULT_BUILDER_SETTINGS.disallow_lower_resolution,
            minimum_resolution_dpi: DEFAULT_BUILDER_SETTINGS.minimum_resolution_dpi,
          });
          break;
        case 'appearance':
          Object.assign(sectionDefaults, {
            color_background: DEFAULT_BUILDER_SETTINGS.color_background,
            color_top_bar: DEFAULT_BUILDER_SETTINGS.color_top_bar,
            color_primary: DEFAULT_BUILDER_SETTINGS.color_primary,
            color_secondary: DEFAULT_BUILDER_SETTINGS.color_secondary,
            color_text: DEFAULT_BUILDER_SETTINGS.color_text,
            font_family: DEFAULT_BUILDER_SETTINGS.font_family,
            button_style: DEFAULT_BUILDER_SETTINGS.button_style,
            toolbox_icon_color: DEFAULT_BUILDER_SETTINGS.toolbox_icon_color,
            action_bar_color: DEFAULT_BUILDER_SETTINGS.action_bar_color,
            card_background_color: DEFAULT_BUILDER_SETTINGS.card_background_color,
          });
          break;
        case 'others':
          Object.assign(sectionDefaults, {
            use_logo_as_loader: DEFAULT_BUILDER_SETTINGS.use_logo_as_loader,
            enable_session_saver: DEFAULT_BUILDER_SETTINGS.enable_session_saver,
            show_gangsheet_price: DEFAULT_BUILDER_SETTINGS.show_gangsheet_price,
            enable_live_chat: DEFAULT_BUILDER_SETTINGS.enable_live_chat,
            live_chat_script: DEFAULT_BUILDER_SETTINGS.live_chat_script,
          });
          break;
      }
      
      setSettings({ ...settings, [key]: true, ...sectionDefaults });
      setHasChanges(true);
    } else {
      // Show confirmation modal before removing from defaults
      setPendingDefaultsOff(section);
    }
  };

  /** Confirm removing from defaults — called when user clicks "I Understand" in modal */
  const confirmDefaultsOff = () => {
    if (!settings || !pendingDefaultsOff) return;
    const key = `${pendingDefaultsOff}_use_defaults` as keyof BuilderSettings;
    setSettings({ ...settings, [key]: false });
    setHasChanges(true);
    setPendingDefaultsOff(null);
  };

  // Save settings
  const handleSave = async () => {
    if (!printer || !settings) return;

    setIsSaving(true);
    try {
      const input: BuilderSettingsInput = {
        printer_id: printer.id,
        ...settings,
      };

      const result = await saveBuilderSettings(input, context);
      if (result.success) {
        toast.success("Settings saved successfully!");
        setHasChanges(false);
        if (result.data) {
          setSettings(result.data);
        }
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset all to defaults
  const handleResetAll = () => {
    if (!printer) return;
    setSettings({
      ...settings!,
      ...DEFAULT_BUILDER_SETTINGS,
    });
    setHasChanges(true);
    toast.info("Settings reset to defaults. Click Save to apply.");
  };

  if (isLoading) {
    return <FormSkeleton fields={8} />;
  }

  if (!printer || !settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load settings.</p>
      </div>
    );
  }

  // Helper: Switch with tooltip when section uses defaults
  const SettingSwitch = ({ 
    checked, 
    onCheckedChange, 
    disabled,
    id 
  }: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
  }) => {
    if (disabled) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch checked={checked} disabled id={id} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Turn off "Use Defaults" to customize this setting</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <Switch checked={checked} onCheckedChange={onCheckedChange} id={id} />;
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight">Public Builder Settings</h2>
          <p className="text-gray-600 mt-1">
            Customize how your public builder looks and behaves for customers
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleResetAll}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset All to Defaults
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Defaults are set according to best practices. However, you are free to change them according to your requirements.
        </p>
      </div>

      {/* ═══ 2-COLUMN GRID FOR CARDS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ============ UPLOADS SECTION ============ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Upload className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Uploads</CardTitle>
                  <CardDescription>Configure image upload behavior</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="uploads-defaults" className="text-sm text-gray-600">
                  Use Defaults
                </Label>
                <Switch
                  id="uploads-defaults"
                  checked={settings.uploads_use_defaults}
                  onCheckedChange={(checked) => toggleSectionDefaults('uploads', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className={settings.uploads_use_defaults ? "opacity-50" : ""}>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Auto resize image to meet 300 DPI</Label>
                  <p className="text-sm text-gray-500 mt-0.5">Automatically resize images to meet print quality requirements</p>
                </div>
                <SettingSwitch
                  checked={settings.auto_resize_to_300dpi}
                  onCheckedChange={(checked) => updateSetting('auto_resize_to_300dpi', checked)}
                  disabled={settings.uploads_use_defaults}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Enable transparent pixel warning</Label>
                  <p className="text-sm text-gray-500 mt-0.5">Warn users when images have transparency issues</p>
                </div>
                <SettingSwitch
                  checked={settings.enable_transparent_pixel_warning}
                  onCheckedChange={(checked) => updateSetting('enable_transparent_pixel_warning', checked)}
                  disabled={settings.uploads_use_defaults}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="font-medium">Enable trim warning</Label>
                  <p className="text-sm text-gray-500 mt-0.5">Suggest trimming images with excess whitespace</p>
                </div>
                <SettingSwitch
                  checked={settings.enable_trim_warning}
                  onCheckedChange={(checked) => updateSetting('enable_trim_warning', checked)}
                  disabled={settings.uploads_use_defaults}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ SHEET SETTINGS SECTION ============ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sheet Settings</CardTitle>
                  <CardDescription>Configure sheet dimensions and limits</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sheet-defaults" className="text-sm text-gray-600">
                  Use Defaults
                </Label>
                <Switch
                  id="sheet-defaults"
                  checked={settings.sheet_settings_use_defaults}
                  onCheckedChange={(checked) => toggleSectionDefaults('sheet_settings', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className={settings.sheet_settings_use_defaults ? "opacity-50 pointer-events-none" : ""}>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Display Unit</Label>
                </div>
                <Select
                  value={settings.size_unit}
                  onValueChange={(value: SizeUnit) => updateSetting('size_unit', value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inch">Inches</SelectItem>
                    <SelectItem value="cm">Centimeters</SelectItem>
                    <SelectItem value="mm">Millimeters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Max Height</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.max_height_inches}
                    onChange={(e) => updateSetting('max_height_inches', parseFloat(e.target.value) || 0)}
                    className="w-24"
                    min={1}
                    max={500}
                  />
                  <span className="text-sm text-gray-500">inches</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Max Sheets per Order</Label>
                </div>
                <Select
                  value={settings.max_sheets.toString()}
                  onValueChange={(value) => updateSetting('max_sheets', parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="font-medium">Default Margin/Spacing</Label>
                  <p className="text-sm text-gray-500 mt-0.5">Space between images (0.1 to 2 inches)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.default_margin_inches}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value >= 0.1 && value <= 2) {
                        updateSetting('default_margin_inches', value);
                      }
                    }}
                    className="w-24"
                    min={0.1}
                    max={2}
                    step={0.1}
                  />
                  <span className="text-sm text-gray-500">inches</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ TOOLS SECTION ============ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Resolution Levels</CardTitle>
                  <CardDescription>Configure DPI thresholds and image quality settings</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tools-defaults" className="text-sm text-gray-600">
                  Use Defaults
                </Label>
                <Switch
                  id="tools-defaults"
                  checked={settings.tools_use_defaults}
                  onCheckedChange={(checked) => toggleSectionDefaults('tools', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className={settings.tools_use_defaults ? "opacity-50 pointer-events-none" : ""}>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Image Trim</Label>
                  <p className="text-sm text-gray-500 mt-0.5">How to handle image trimming</p>
                </div>
                <Select
                  value={settings.image_trim_mode}
                  onValueChange={(value: ImageTrimMode) => updateSetting('image_trim_mode', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="auto">Auto trim on upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="py-3 border-b">
                <Label className="font-medium mb-4 block">Resolution Levels</Label>
                <p className="text-sm text-gray-500 mb-4">Configure DPI thresholds for quality indicators</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#22c55e' }}></div>
                    <Label className="w-40">Optimal Resolution:</Label>
                    <Input type="number" value={settings.resolution_optimal_dpi} onChange={(e) => updateSetting('resolution_optimal_dpi', parseInt(e.target.value) || 0)} className="w-24" />
                    <span className="text-sm text-gray-500">dpi ~</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#f4dc00' }}></div>
                    <Label className="w-40">Good Resolution:</Label>
                    <Input type="number" value={settings.resolution_good_dpi} onChange={(e) => updateSetting('resolution_good_dpi', parseInt(e.target.value) || 0)} className="w-24" />
                    <span className="text-sm text-gray-500">dpi ~</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#ef4444' }}></div>
                    <Label className="w-40">Bad Resolution:</Label>
                    <Input type="number" value={settings.resolution_bad_dpi} onChange={(e) => updateSetting('resolution_bad_dpi', parseInt(e.target.value) || 0)} className="w-24" />
                    <span className="text-sm text-gray-500">dpi ~</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#171717' }}></div>
                    <Label className="w-40">Terrible Resolution:</Label>
                    <Input type="number" value={settings.resolution_terrible_dpi} onChange={(e) => updateSetting('resolution_terrible_dpi', parseInt(e.target.value) || 0)} className="w-24" />
                    <span className="text-sm text-gray-500">dpi ~</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Switch id="hide-terrible" checked={settings.hide_terrible_resolution} onCheckedChange={(checked) => updateSetting('hide_terrible_resolution', checked)} />
                  <Label htmlFor="hide-terrible" className="text-sm">Hide Terrible Resolution</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-indigo-500 hover:text-indigo-700"><HelpCircle className="w-4 h-4" /></button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      Enabling this removes the 'Terrible' (black) quality tier and folds it into 'Bad'. Useful if you prefer a simpler three-level DPI indicator for your customers.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="disallow-lower" className="font-medium">Disallow Lower Resolution</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-indigo-500 hover:text-indigo-700"><HelpCircle className="w-4 h-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        When active, customers are blocked from uploading images that fall below the minimum DPI threshold. They also won't be able to enlarge images past the point where resolution drops below that floor. This helps ensure only print-ready files make it into orders.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch 
                    id="disallow-lower" 
                    checked={settings.disallow_lower_resolution} 
                    onCheckedChange={(checked) => updateSetting('disallow_lower_resolution', checked)} 
                  />
                </div>
                {settings.disallow_lower_resolution && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>Customers won't be able to upload images below the minimum DPI, or scale existing images to a resolution lower than this threshold.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Minimum Resolution:</Label>
                      <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#171717' }}></div>
                      <Input 
                        type="number" 
                        value={settings.minimum_resolution_dpi} 
                        onChange={(e) => updateSetting('minimum_resolution_dpi', parseInt(e.target.value) || 0)} 
                        className="w-20" 
                      />
                      <span className="text-sm text-gray-500">dpi</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ OTHERS SECTION ============ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <MoreHorizontal className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Others</CardTitle>
                  <CardDescription>Additional settings</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="others-defaults" className="text-sm text-gray-600">
                  Use Defaults
                </Label>
                <Switch
                  id="others-defaults"
                  checked={settings.others_use_defaults}
                  onCheckedChange={(checked) => toggleSectionDefaults('others', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className={settings.others_use_defaults ? "opacity-50" : ""}>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Show Gang Sheet Price</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-indigo-500 hover:text-indigo-700"><HelpCircle className="w-4 h-4" /></button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      When enabled, customers will see the calculated price for their gang sheet in the builder's top bar. Turn this off if you prefer to share pricing separately or handle it outside the builder.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SettingSwitch
                  checked={settings.show_gangsheet_price}
                  onCheckedChange={(checked) => updateSetting('show_gangsheet_price', checked)}
                  disabled={settings.others_use_defaults}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="font-medium">Session Saver</Label>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Automatically save customer's work so they can resume if they accidentally close the browser
                  </p>
                </div>
                <SettingSwitch
                  checked={settings.enable_session_saver}
                  onCheckedChange={(checked) => updateSetting('enable_session_saver', checked)}
                  disabled={settings.others_use_defaults}
                />
              </div>

              <div className="py-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Enable live chat</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-indigo-500 hover:text-indigo-700"><HelpCircle className="w-4 h-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        Embed your chat widget (Tawk.to, Crisp, Tidio, WhatsApp, etc.) directly into the builder so customers can reach you while designing their gang sheets.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <SettingSwitch
                    checked={settings.enable_live_chat}
                    onCheckedChange={(checked) => updateSetting('enable_live_chat', checked)}
                    disabled={settings.others_use_defaults}
                  />
                </div>
                {settings.enable_live_chat && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>This allows your customers to chat with you while they are designing. Paste your chat widget's embed script below.</span>
                    </div>
                    <Textarea
                      placeholder={'<script>\n  // Paste your chat widget embed code here\n</script>'}
                      value={settings.live_chat_script}
                      onChange={(e) => updateSetting('live_chat_script', e.target.value)}
                      className="font-mono text-sm min-h-[120px]"
                      disabled={settings.others_use_defaults}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ APPEARANCE SECTION — full width ============ */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Palette className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Appearance</CardTitle>
                  <CardDescription>Customize colors and branding</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="appearance-defaults" className="text-sm text-gray-600">
                  Use Defaults
                </Label>
                <Switch
                  id="appearance-defaults"
                  checked={settings.appearance_use_defaults}
                  onCheckedChange={(checked) => toggleSectionDefaults('appearance', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className={settings.appearance_use_defaults ? "opacity-50 pointer-events-none" : ""}>
            <div className="space-y-6">
              {/* Color Theme */}
              <div>
                <p className="text-sm text-gray-600 mb-4">Color Theme</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.color_background} onChange={(e) => updateSetting('color_background', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div><Label className="font-medium text-sm">Background</Label><p className="text-xs text-gray-400">{settings.color_background}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.color_top_bar} onChange={(e) => updateSetting('color_top_bar', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div><Label className="font-medium text-sm">Top Bar</Label><p className="text-xs text-gray-400">{settings.color_top_bar}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.action_bar_color || settings.color_top_bar} onChange={(e) => updateSetting('action_bar_color', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div>
                      <Label className="font-medium text-sm">Action Bar</Label>
                      <p className="text-xs text-gray-400">{settings.action_bar_color || 'Same as Top Bar'}</p>
                      {settings.action_bar_color && <button type="button" onClick={() => updateSetting('action_bar_color', '')} className="text-[10px] text-indigo-500 hover:underline">Reset</button>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.color_primary} onChange={(e) => updateSetting('color_primary', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div><Label className="font-medium text-sm">Primary</Label><p className="text-xs text-gray-400">{settings.color_primary}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.color_text} onChange={(e) => updateSetting('color_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div><Label className="font-medium text-sm">Text</Label><p className="text-xs text-gray-400">{settings.color_text}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.toolbox_icon_color || '#4F46E5'} onChange={(e) => updateSetting('toolbox_icon_color', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div>
                      <Label className="font-medium text-sm">Toolbox Icons</Label>
                      <p className="text-xs text-gray-400">{settings.toolbox_icon_color || 'Default'}</p>
                      {settings.toolbox_icon_color && <button type="button" onClick={() => updateSetting('toolbox_icon_color', '')} className="text-[10px] text-indigo-500 hover:underline">Reset</button>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.card_background_color || '#ffffff'} onChange={(e) => updateSetting('card_background_color', e.target.value)} className="w-9 h-9 rounded cursor-pointer border-2 border-gray-200" />
                    <div><Label className="font-medium text-sm">Image Card</Label><p className="text-xs text-gray-400">{settings.card_background_color || '#ffffff'}</p></div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Font, Button Style, Toolbox — 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Font Family */}
                <div>
                  <Label className="font-medium mb-2 block">Font Family</Label>
                  <Select 
                    value={GOOGLE_FONTS.includes(settings.font_family) ? settings.font_family : ''} 
                    onValueChange={(val) => updateSetting('font_family', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a font" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOOGLE_FONTS.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Input 
                      placeholder="Or type exact Google Font name..." 
                      value={GOOGLE_FONTS.includes(settings.font_family) ? '' : (settings.font_family || '')} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.trim()) updateSetting('font_family', val);
                      }}
                      onBlur={() => {
                        if (!settings.font_family || settings.font_family.trim() === '') updateSetting('font_family', 'Inter');
                      }}
                    />
                    <p className="text-xs mt-1">
                      {!GOOGLE_FONTS.includes(settings.font_family) && settings.font_family && settings.font_family !== 'Inter'
                        ? <span className="text-indigo-500 font-medium">Using: {settings.font_family}</span>
                        : <span className="text-gray-400">Browse at <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">fonts.google.com</a></span>
                      }
                    </p>
                  </div>
                </div>

                {/* Button Style + Toolbox Color stacked */}
                <div className="space-y-5">
                  <div>
                    <Label className="font-medium mb-2 block">Button Style</Label>
                    <div className="flex gap-3">
                      {BUTTON_STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateSetting('button_style', opt.value)}
                          className={`px-4 py-2 text-sm font-medium border-2 transition-all ${
                            settings.button_style === opt.value 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          style={{ borderRadius: opt.preview }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preview — mini builder mockup */}
              <div>
                <Label className="font-medium mb-3 block">Preview</Label>
                <link href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(settings.font_family || 'Inter')}:wght@400;500;600;700&display=swap`} rel="stylesheet" />
                <div className="max-w-md mx-auto">
                  <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ fontFamily: `'${settings.font_family || 'Inter'}', sans-serif` }}>
                    
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: settings.color_top_bar }}>
                      <div className="flex items-center gap-2">
                        {printer?.logo_url ? (
                          <img src={printer.logo_url} className="h-6 w-auto rounded" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                            {(printer?.store_name || 'S').charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-white">{printer?.store_name || 'Your Store'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/60">Sheet: 22" × --</span>
                        <button className="px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: settings.color_primary, borderRadius: BUTTON_STYLE_OPTIONS.find(o => o.value === settings.button_style)?.preview || '8px' }}>
                          Add to Cart
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-5" style={{ backgroundColor: settings.color_background }}>
                      {/* Headline */}
                      <h3 className="text-lg font-bold text-center mb-1" style={{ color: settings.color_text }}>
                        Create Your Gang Sheet
                      </h3>
                      <p className="text-xs text-center mb-4" style={{ color: settings.color_text, opacity: 0.5 }}>
                        Upload your designs and generate optimized layouts
                      </p>

                      {/* Upload area */}
                      <div className="border-2 border-dashed rounded-xl p-3 flex items-center justify-between mb-4" style={{ borderColor: `${settings.color_primary}40` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: settings.color_primary }}>📂</div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: settings.color_text }}>Drop images here</p>
                            <p className="text-[10px]" style={{ color: settings.color_text, opacity: 0.4 }}>PNG, JPG • Max 25 MB</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: settings.color_primary, borderRadius: BUTTON_STYLE_OPTIONS.find(o => o.value === settings.button_style)?.preview || '8px' }}>
                          Browse
                        </button>
                      </div>

                      {/* Toolbox */}
                      <div className="flex justify-center gap-4 mb-3">
                        {['✂', '↻', '🎨', '✦', 'T'].map((icon, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shadow-md" style={{ backgroundColor: settings.toolbox_icon_color || ['#4F46E5', '#0ea5e9', '#a855f7', '#f59e0b', '#4F46E5'][i] }}>
                              {icon}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Empty state */}
                      <div className="text-center py-3">
                        <p className="text-xs font-medium" style={{ color: settings.color_text, opacity: 0.3 }}>No images uploaded yet</p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: settings.action_bar_color || settings.color_top_bar }}>
                      <span className="text-[10px] text-white/60">Sheet Width: 22 inches (fixed)</span>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 text-[10px] font-medium text-white/50 border border-white/20 bg-transparent" style={{ borderRadius: BUTTON_STYLE_OPTIONS.find(o => o.value === settings.button_style)?.preview || '8px' }}>
                          Preview
                        </button>
                        <button className="px-3 py-1 text-[10px] font-semibold text-white shadow" style={{ backgroundColor: settings.color_primary, borderRadius: BUTTON_STYLE_OPTIONS.find(o => o.value === settings.button_style)?.preview || '8px' }}>
                          Generate Layout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>{/* end 2-column grid */}

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="flex items-center justify-end gap-4">
          <div>
            {hasChanges && (
              <p className="text-sm text-amber-600 font-medium">
                You have unsaved changes
              </p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>

    {/* Confirmation modal when removing from defaults */}
    <Dialog open={!!pendingDefaultsOff} onOpenChange={(open) => { if (!open) setPendingDefaultsOff(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Customize Settings</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Defaults are set according to best practices. However, you are free to change them according to your requirements.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => setPendingDefaultsOff(null)}>
            Keep Defaults
          </Button>
          <Button onClick={confirmDefaultsOff}>
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </TooltipProvider>
  );
};

export default BuilderSettingsPage;
