using System;
using System.IO;
using System.Text;

// NB this can also be used from PowerShell as:
//      Add-Type -Path IsoInfo.cs
//      [IsoInfo]::GetVolumeCreationDate('my.iso')
public class IsoInfo
{
    // see https://wiki.osdev.org/ISO_9660#The_Primary_Volume_Descriptor
    static bool IsPrimaryVolumeDescriptorSector(byte[] sector)
    {
        const byte PrimaryVolumeDescriptorType = 1;
        const byte VolumeDescriptorVersion = 1;
        var VolumeDescriptiorIdentifier = new byte[] {(byte)'C', (byte)'D', (byte)'0', (byte)'0', (byte)'1'};

        if (sector[0] != PrimaryVolumeDescriptorType)
        {
            return false;
        }

        for (var n = 0; n < VolumeDescriptiorIdentifier.Length; ++n)
        {
            if (sector[1+n] != VolumeDescriptiorIdentifier[n])
            {
                return false;
            }
        }

        if (sector[6] != VolumeDescriptorVersion)
        {
            return false;
        }

        return true;
    }

    // see https://wiki.osdev.org/ISO_9660#Date.2Ftime_format
    static DateTimeOffset ReadDateTime(byte[] sector, int offset)
    {
        var year        = ReadAsciiInt(sector, offset+0,  4);
        var month       = ReadAsciiInt(sector, offset+4,  2);
        var day         = ReadAsciiInt(sector, offset+6,  2);
        var hour        = ReadAsciiInt(sector, offset+8,  2);
        var minute      = ReadAsciiInt(sector, offset+10, 2);
        var second      = ReadAsciiInt(sector, offset+12, 2);
        var hundredths  = ReadAsciiInt(sector, offset+14, 2);
        var utcOffset   = TimeSpan.FromMinutes((int)sector[offset+16]*15);

        return new DateTimeOffset(year, month, day, hour, minute, second, hundredths*10, utcOffset);
    }

    static int ReadAsciiInt(byte[] sector, int offset, int size)
    {
        var sb = new StringBuilder(size);

        for (var n = 0; n < size; ++n)
        {
            sb.Append((char)sector[offset+n]);
        }

        return int.Parse(sb.ToString());
    }

    // see https://wiki.osdev.org/ISO_9660
    // NB this is equivalent to:
    //      isoinfo -debug -d -i my.iso
    public static DateTimeOffset GetVolumeCreationDate(string path)
    {
        using (var stream = File.Open(path, FileMode.Open, FileAccess.Read))
        {
            const int SectorSize = 2048;
            const byte VolumeDescriptorSetTerminatorType = 255;

            // read the Primary Volume Descriptor.
            for (var sectorIndex = 16; ; ++sectorIndex)
            {
                var sector = new byte[SectorSize];

                stream.Position = sectorIndex*SectorSize;
                if (stream.Read(sector, 0, sector.Length) != sector.Length)
                {
                    throw new ApplicationException("failed to read sector");
                }

                if (sector[0] == VolumeDescriptorSetTerminatorType)
                {
                    break;
                }

                if (!IsPrimaryVolumeDescriptorSector(sector))
                {
                    continue;
                }

                var volumeCreationDateTime = ReadDateTime(sector, 813);

                return volumeCreationDateTime;
            }
            
            throw new ApplicationException("failed to find the primary volume descriptor sector");
        }
    }
}